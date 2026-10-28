from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Dict, Hashable, List, Tuple, Union
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload
from thesweets_common.models.order import Order, OrderDetail, OrderStatusLog
from thesweets_common.models.product import Product
from thesweets_common.models.user import User
from thesweets_common.models.import_receipt import ImportReceipt
from app.schemas.admin.report import (
    GroupBy,
    PivotRowOut,
    PivotTableOut,
    ReportFilter,
    ReportSummaryOut,
    RevenueReportOut,
    TimeRowOut,
)
from app.services.export.excel_service import ExcelExportService

ZERO = Decimal("0")
UNKNOWN_STAFF = "Chưa xác định"

# Khóa của một kỳ: ngày -> date, tháng/quý -> (năm, tháng/quý), năm -> năm
PeriodKey = Union[date, Tuple[int, int], int]

def _period_key(group: GroupBy, d: Union[date, datetime]) -> PeriodKey:
    if group == "day":
        return d.date() if isinstance(d, datetime) else d
    if group == "month":
        return (d.year, d.month)
    if group == "quarter":
        return (d.year, (d.month - 1) // 3 + 1)
    return d.year

def _period_label(group: GroupBy, key: PeriodKey) -> str:
    if group == "day":
        return f"{key:%d/%m/%Y}"
    if group == "month":
        return f"Tháng {key[1]:02d}/{key[0]}"
    if group == "quarter":
        return f"Quý {key[1]}/{key[0]}"
    return f"Năm {key}"

def _period_keys(group: GroupBy, from_date: date, to_date: date) -> List[PeriodKey]:
    """Mọi kỳ nằm trong [from_date, to_date] theo thứ tự thời gian, kể cả kỳ không phát sinh"""
    keys: List[PeriodKey] = []
    d = from_date
    while d <= to_date:
        key = _period_key(group, d)
        if not keys or keys[-1] != key:
            keys.append(key)
        d += timedelta(days=1)
    return keys

def _full_name(person) -> str:
    return " ".join(p for p in (person.first_name, person.last_name) if p).strip()

def _add(acc: Dict[Hashable, dict], row_key: Hashable, name: str, sub: str, period: PeriodKey, amount: Decimal, count: int):
    row = acc.setdefault(row_key, {"name": name, "sub": sub, "values": {}, "count": 0})
    row["values"][period] = row["values"].get(period, ZERO) + amount
    row["count"] += count

def _pivot(group: GroupBy, periods: List[PeriodKey], acc: Dict[Hashable, dict]) -> PivotTableOut:
    rows = []
    for r in acc.values():
        values = [r["values"].get(p, ZERO) for p in periods]
        rows.append(PivotRowOut(name=r["name"], sub=r["sub"], count=r["count"], values=values, total=sum(values, ZERO)))
    rows.sort(key=lambda r: (-r.total, r.name))
    column_totals = [sum((r.values[i] for r in rows), ZERO) for i in range(len(periods))]
    return PivotTableOut(
        columns=[_period_label(group, p) for p in periods],
        rows=rows,
        column_totals=column_totals,
        count=sum(r.count for r in rows),
        total=sum(column_totals, ZERO),
    )

class AdminReportService:
    @staticmethod
    def completed_orders(db: Session, start: datetime, end: datetime) -> List[Order]:
        """Hóa đơn = đơn Completed có ngày đặt trong [start, end), kèm khách hàng và chi tiết món"""
        return (
            db.query(Order)
            .options(
                selectinload(Order.details).selectinload(OrderDetail.product).selectinload(Product.category),
                selectinload(Order.details).selectinload(OrderDetail.size),
                selectinload(Order.promotion),
                selectinload(Order.customer),
            )
            .filter(Order.status == "Completed", Order.order_date >= start, Order.order_date < end)
            .order_by(Order.order_date)
            .all()
        )

    @staticmethod
    def revenue_report(db: Session, f: ReportFilter) -> RevenueReportOut:
        return AdminReportService._build(db, f)[0]

    @staticmethod
    def export_excel(db: Session, f: ReportFilter) -> Tuple[bytes, str]:
        """File Excel của báo cáo doanh thu (cùng số liệu với màn hình) và tên file gợi ý"""
        report, orders = AdminReportService._build(db, f)
        filename = f"bao-cao-doanh-thu-{f.from_date:%Y%m%d}-{f.to_date:%Y%m%d}.xlsx"
        return ExcelExportService.revenue_report(report, orders), filename

    @staticmethod
    def _staff_of_orders(db: Session, start: datetime, end: datetime) -> Dict[int, Tuple[str, str]]:
        """
        Nhân viên lập hóa đơn = người chuyển đơn sang 'Completed' (lần đầu) trong lịch sử trạng thái.
        changed_by lưu SĐT tài khoản nhân viên; trả về {order_id: (tên, SĐT)}.
        """
        logs = (
            db.query(OrderStatusLog.order_id, OrderStatusLog.changed_by)
            .join(Order, Order.order_id == OrderStatusLog.order_id)
            .filter(
                Order.status == "Completed", Order.order_date >= start, Order.order_date < end,
                OrderStatusLog.new_status == "Completed",
            )
            .order_by(OrderStatusLog.changed_at, OrderStatusLog.log_id)
            .all()
        )
        first_by_order: Dict[int, str] = {}
        for order_id, changed_by in logs:
            first_by_order.setdefault(order_id, changed_by)

        phones = {p for p in first_by_order.values() if p}
        users = (
            db.query(User).options(selectinload(User.customer)).filter(User.phone.in_(phones)).all()
            if phones else []
        )
        names = {u.phone: (_full_name(u.customer) if u.customer else "") or u.email for u in users}
        return {
            order_id: (names[phone], phone) if phone in names else (phone or UNKNOWN_STAFF, "")
            for order_id, phone in first_by_order.items()
        }

    @staticmethod
    def _data_years(db: Session) -> Tuple[int, int]:
        """Năm đầu và năm cuối có hóa đơn / phiếu nhập hoàn tất (luôn gồm năm hiện tại)"""
        years = [date.today().year]
        for low, high in (
            db.query(func.min(Order.order_date), func.max(Order.order_date)).filter(Order.status == "Completed").one(),
            db.query(func.min(ImportReceipt.import_date), func.max(ImportReceipt.import_date))
            .filter(ImportReceipt.status == "Completed").one(),
        ):
            years += [d.year for d in (low, high) if d]
        return min(years), max(years)

    @staticmethod
    def _build(db: Session, f: ReportFilter) -> Tuple[RevenueReportOut, List[Order]]:
        start = datetime.combine(f.from_date, time.min)
        end = datetime.combine(f.to_date + timedelta(days=1), time.min)

        # Bảng theo quý / năm liệt kê đủ mọi quý / năm có dữ liệu nên lấy toàn bộ hóa đơn, phiếu nhập;
        # tổng hợp và bảng theo ngày / tháng chỉ dùng phần nằm trong khoảng ngày lọc
        first_year, last_year = AdminReportService._data_years(db)
        all_from, all_to = date(first_year, 1, 1), date(last_year, 12, 31)
        all_start, all_end = datetime(first_year, 1, 1), datetime(last_year + 1, 1, 1)

        all_orders = AdminReportService.completed_orders(db, all_start, all_end)
        orders = [o for o in all_orders if start <= o.order_date < end]
        cancelled = db.query(Order).filter(
            Order.status == "Cancelled", Order.order_date >= start, Order.order_date < end
        ).count()
        all_receipts = (
            db.query(ImportReceipt.import_date, ImportReceipt.total_amount)
            .filter(ImportReceipt.status == "Completed", ImportReceipt.import_date >= all_start, ImportReceipt.import_date < all_end)
            .all()
        )
        receipts = [r for r in all_receipts if start <= r.import_date < end]

        # a) Tổng tiền hóa đơn trong khoảng ngày
        revenue = sum((o.final_cost for o in orders), ZERO)
        expense = sum((r.total_amount for r in receipts), ZERO)
        summary = ReportSummaryOut(
            invoice_count=len(orders),
            cancelled_count=cancelled,
            items_sold=sum(o.total_quantity for o in orders),
            gross_amount=sum((o.total_cost for o in orders), ZERO),
            discount_amount=sum((o.discount_amount or ZERO for o in orders), ZERO),
            revenue=revenue,
            import_count=len(receipts),
            expense=expense,
            profit=revenue - expense,
        )

        # b) Thu - chi - lợi nhuận: theo ngày trong khoảng ngày, theo tháng / quý trong một năm, theo năm trên mọi năm
        if f.group_by == "day":
            t_from, t_to = f.time_from_date, f.time_to_date
        elif f.group_by == "year":
            t_from, t_to = all_from, all_to
        else:
            t_from, t_to = date(f.time_year, 1, 1), date(f.time_year, 12, 31)
        periods = _period_keys(f.group_by, t_from, t_to)
        t_start = datetime.combine(t_from, time.min)
        t_end = datetime.combine(t_to + timedelta(days=1), time.min)
        time_orders = [o for o in all_orders if t_start <= o.order_date < t_end]
        time_receipts = [r for r in all_receipts if t_start <= r.import_date < t_end]
        buckets = {p: {"invoice_count": 0, "revenue": ZERO, "import_count": 0, "expense": ZERO} for p in periods}
        for o in time_orders:
            b = buckets[_period_key(f.group_by, o.order_date)]
            b["invoice_count"] += 1
            b["revenue"] += o.final_cost
        for r in time_receipts:
            b = buckets[_period_key(f.group_by, r.import_date)]
            b["import_count"] += 1
            b["expense"] += r.total_amount
        by_time = [
            TimeRowOut(label=_period_label(f.group_by, p), profit=b["revenue"] - b["expense"], **b)
            for p, b in buckets.items()
        ]

        # c) Nhân viên x năm, d) khách hàng x quý/năm, e) sản phẩm x quý — trên mọi quý / năm
        staff_of = AdminReportService._staff_of_orders(db, all_start, all_end)
        by_staff: Dict[Hashable, dict] = {}
        by_customer: Dict[Hashable, dict] = {}
        by_product: Dict[Hashable, dict] = {}
        for o in all_orders:
            staff_name, staff_phone = staff_of.get(o.order_id, (UNKNOWN_STAFF, ""))
            _add(by_staff, (staff_name, staff_phone), staff_name, staff_phone, o.order_date.year, o.final_cost, 1)

            c = o.customer
            customer_name = (_full_name(c) if c else "") or o.recipient_name
            _add(by_customer, o.customer_id, customer_name, c.phone if c else o.recipient_phone,
                 _period_key(f.customer_group_by, o.order_date), o.final_cost, 1)

            quarter = _period_key("quarter", o.order_date)
            for d in o.details:
                category = d.product.category.category_name if d.product and d.product.category else "Khác"
                product_name = d.product.product_name if d.product else f"#{d.product_id}"
                _add(by_product, d.product_id, product_name, category, quarter, d.price * d.quantity, d.quantity)

        report = RevenueReportOut(
            from_date=f.from_date,
            to_date=f.to_date,
            time_from_date=f.time_from_date,
            time_to_date=f.time_to_date,
            time_year=f.time_year,
            group_by=f.group_by,
            customer_group_by=f.customer_group_by,
            first_year=first_year,
            last_year=last_year,
            summary=summary,
            by_time=by_time,
            by_staff=_pivot("year", _period_keys("year", all_from, all_to), by_staff),
            by_customer=_pivot(f.customer_group_by, _period_keys(f.customer_group_by, all_from, all_to), by_customer),
            by_product=_pivot("quarter", _period_keys("quarter", all_from, all_to), by_product),
        )
        return report, orders

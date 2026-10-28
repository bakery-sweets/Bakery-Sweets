from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session, selectinload
from app.core.labels import PAYMENT_METHOD_LABELS
from thesweets_common.models.order import Order, OrderDetail
from thesweets_common.models.product import Product
from app.schemas.admin.report import (
    ReportPeriod,
    RevenueBucketOut,
    RevenueReportOut,
    ShareItemOut,
    ProductRankOut,
)
from app.services.export.excel_service import ExcelExportService

# Nhãn thứ theo weekday() của Python (0 = Thứ 2 ... 6 = Chủ nhật)
DAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"]
ZERO = Decimal("0")

def _percent(part: Decimal, total: Decimal) -> int:
    """Làm tròn nửa lên như Math.round của giao diện"""
    if not total:
        return 0
    return int((part * 100 / total).quantize(Decimal("1"), rounding=ROUND_HALF_UP))

def _add_months(d: datetime, months: int) -> datetime:
    month_index = d.month - 1 + months
    return d.replace(year=d.year + month_index // 12, month=month_index % 12 + 1, day=1)

def _period_start(period: ReportPeriod, now: datetime) -> datetime:
    day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "week":
        return day - timedelta(days=day.weekday())
    if period == "month":
        return day.replace(day=1)
    if period == "quarter":
        return day.replace(month=(day.month - 1) // 3 * 3 + 1, day=1)
    if period == "year":
        return day.replace(month=1, day=1)
    return day

def _period_label(period: ReportPeriod, now: datetime) -> str:
    return {
        "today": "Hôm nay",
        "week": "Tuần này",
        "month": "Tháng này",
        "quarter": "Quý này",
        "year": f"Năm {now.year}",
    }[period]

def _buckets(period: ReportPeriod, start: datetime) -> Tuple[str, List[Tuple[datetime, datetime, str, str]]]:
    """Các khoảng thời gian của biểu đồ: hôm nay theo 2 giờ, tuần/tháng theo ngày, quý/năm theo tháng"""
    if period == "today":
        items = []
        for i in range(12):
            frm = start + timedelta(hours=2 * i)
            items.append((frm, frm + timedelta(hours=2), f"{frm.hour}h", f"{frm.hour}:00 - {frm.hour + 2}:00"))
        return "Theo giờ", items

    if period in ("week", "month"):
        days = 7 if period == "week" else (_add_months(start, 1) - start).days
        items = []
        for i in range(days):
            frm = start + timedelta(days=i)
            label = DAY_LABELS[frm.weekday()] if period == "week" else str(frm.day)
            items.append((frm, frm + timedelta(days=1), label, f"{DAY_LABELS[frm.weekday()]} {frm:%d/%m/%Y}"))
        return "Theo ngày", items

    months = 3 if period == "quarter" else 12
    items = []
    for i in range(months):
        frm = _add_months(start, i)
        items.append((frm, _add_months(start, i + 1), f"T{frm.month}", f"Tháng {frm.month}/{frm.year}"))
    return "Theo tháng", items

def _shares(values: Dict[str, Decimal]) -> List[ShareItemOut]:
    total = sum(values.values(), ZERO)
    items = [ShareItemOut(name=name, value=value, percent=_percent(value, total)) for name, value in values.items()]
    return sorted(items, key=lambda s: s.value, reverse=True)

class AdminReportService:
    @staticmethod
    def completed_orders(db: Session, start: datetime, end: datetime) -> List[Order]:
        """Đơn hoàn tất trong khoảng [start, end], kèm chi tiết món để tính báo cáo / xuất Excel"""
        return (
            db.query(Order)
            .options(
                selectinload(Order.details).selectinload(OrderDetail.product).selectinload(Product.category),
                selectinload(Order.details).selectinload(OrderDetail.size),
                selectinload(Order.promotion),
            )
            .filter(Order.status == "Completed", Order.order_date >= start, Order.order_date <= end)
            .order_by(Order.order_date)
            .all()
        )

    @staticmethod
    def revenue_report(db: Session, period: ReportPeriod, now: Optional[datetime] = None) -> RevenueReportOut:
        """
        Báo cáo doanh thu của kỳ (từ đầu kỳ tới hiện tại).
        Doanh thu chỉ tính đơn Completed, giống định nghĩa của /admin/dashboard/overview.
        """
        return AdminReportService._build(db, period, now or datetime.now())[0]

    @staticmethod
    def export_excel(db: Session, period: ReportPeriod) -> Tuple[bytes, str]:
        """File Excel của báo cáo doanh thu (cùng số liệu với màn hình) và tên file gợi ý"""
        now = datetime.now()
        report, orders = AdminReportService._build(db, period, now)
        return ExcelExportService.revenue_report(report, orders), f"bao-cao-doanh-thu-{period}-{now:%Y%m%d}.xlsx"

    @staticmethod
    def _build(db: Session, period: ReportPeriod, now: datetime) -> Tuple[RevenueReportOut, List[Order]]:
        start = _period_start(period, now)
        orders = AdminReportService.completed_orders(db, start, now)
        cancelled = db.query(Order).filter(
            Order.status == "Cancelled", Order.order_date >= start, Order.order_date <= now
        ).count()

        revenue = sum((o.final_cost for o in orders), ZERO)
        items_sold = sum(o.total_quantity for o in orders)

        by_category: Dict[str, Decimal] = {}
        by_payment: Dict[str, Decimal] = {}
        by_product: Dict[int, dict] = {}
        for o in orders:
            method = PAYMENT_METHOD_LABELS.get(o.payment_method, o.payment_method)
            by_payment[method] = by_payment.get(method, ZERO) + o.final_cost
            for d in o.details:
                line_total = d.price * d.quantity
                category = d.product.category.category_name if d.product and d.product.category else "Khác"
                by_category[category] = by_category.get(category, ZERO) + line_total
                p = by_product.setdefault(d.product_id, {
                    "name": d.product.product_name if d.product else f"#{d.product_id}",
                    "category": category,
                    "sales": 0,
                    "revenue": ZERO,
                })
                p["sales"] += d.quantity
                p["revenue"] += line_total

        # Tỷ trọng từng món tính trên tổng tiền bánh (trước voucher) để các món cộng lại đúng 100%
        lines_total = sum(by_category.values(), ZERO)
        ranked = sorted(by_product.items(), key=lambda kv: (-kv[1]["sales"], -kv[1]["revenue"]))
        product_ranking = [
            ProductRankOut(
                rank=idx + 1,
                product_id=product_id,
                name=p["name"],
                category=p["category"],
                sales=p["sales"],
                revenue=p["revenue"],
                percent=_percent(p["revenue"], lines_total),
            )
            for idx, (product_id, p) in enumerate(ranked)
        ]

        chart_title, ranges = _buckets(period, start)
        buckets = []
        for frm, to, label, full_label in ranges:
            in_bucket = [o for o in orders if frm <= o.order_date < to]
            buckets.append(RevenueBucketOut(
                label=label,
                full_label=full_label,
                order_count=len(in_bucket),
                revenue=sum((o.final_cost for o in in_bucket), ZERO),
            ))

        report = RevenueReportOut(
            period=period,
            period_label=_period_label(period, now),
            chart_title=chart_title,
            start_date=start,
            end_date=now,
            revenue=revenue,
            order_count=len(orders),
            cancelled_count=cancelled,
            items_sold=items_sold,
            avg_order_value=(revenue / len(orders)).quantize(Decimal("1"), rounding=ROUND_HALF_UP) if orders else ZERO,
            buckets=buckets,
            category_share=_shares(by_category),
            payment_share=_shares(by_payment),
            product_ranking=product_ranking,
        )
        return report, orders

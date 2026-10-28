from typing import List, Literal, Optional
from datetime import date
from decimal import Decimal
from pydantic import BaseModel

# Cách gom nhóm bảng thu - chi - lợi nhuận theo thời gian:
# day -> từng ngày trong khoảng ngày, month / quarter -> 12 tháng / 4 quý của một năm, year -> mọi năm có dữ liệu
GroupBy = Literal["day", "month", "quarter", "year"]
# Cột thời gian của bảng thống kê theo khách hàng
CustomerGroupBy = Literal["quarter", "year"]

class ReportFilter(BaseModel):
    from_date: date             # Khoảng ngày của bảng tổng tiền hóa đơn
    to_date: date
    time_from_date: date        # Khoảng ngày của bảng thu - chi khi xem theo ngày
    time_to_date: date
    time_year: int              # Năm của bảng thu - chi khi xem theo tháng / quý
    group_by: GroupBy = "month"
    customer_group_by: CustomerGroupBy = "quarter"

class ReportSummaryOut(BaseModel):
    """Tổng tiền hóa đơn từ ngày a đến ngày b"""
    invoice_count: int
    cancelled_count: int
    items_sold: int
    gross_amount: Decimal       # Tổng tiền hàng trước giảm giá
    discount_amount: Decimal    # Tổng giảm giá voucher
    revenue: Decimal            # Tổng tiền hóa đơn (tổng thu)
    import_count: int
    expense: Decimal            # Tổng tiền phiếu nhập hàng (tổng chi)
    profit: Decimal

class TimeRowOut(BaseModel):
    """Một dòng của bảng thu - chi theo ngày / tháng / quý / năm"""
    label: str
    invoice_count: int
    revenue: Decimal
    import_count: int
    expense: Decimal
    profit: Decimal

class PivotRowOut(BaseModel):
    name: str
    sub: Optional[str] = None   # SĐT (nhân viên, khách hàng) hoặc danh mục (sản phẩm)
    count: int                  # Số hóa đơn (nhân viên, khách hàng) hoặc số lượng bán (sản phẩm)
    values: List[Decimal]       # Tổng tiền theo từng cột thời gian, cùng thứ tự với PivotTableOut.columns
    total: Decimal

class PivotTableOut(BaseModel):
    """Bảng thống kê chéo: mỗi dòng là một nhân viên / khách hàng / sản phẩm, mỗi cột là một kỳ"""
    columns: List[str]
    rows: List[PivotRowOut]
    column_totals: List[Decimal]
    count: int
    total: Decimal

class RevenueReportOut(BaseModel):
    from_date: date
    to_date: date
    time_from_date: date
    time_to_date: date
    time_year: int
    group_by: GroupBy
    customer_group_by: CustomerGroupBy
    # Thu - chi theo năm và các bảng nhân viên, khách hàng, sản phẩm không theo khoảng ngày
    # mà liệt kê đủ mọi quý / năm từ first_year đến last_year
    first_year: int
    last_year: int
    summary: ReportSummaryOut
    by_time: List[TimeRowOut]
    by_staff: PivotTableOut
    by_customer: PivotTableOut
    by_product: PivotTableOut

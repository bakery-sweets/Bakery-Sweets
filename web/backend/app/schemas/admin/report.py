from typing import List, Literal, Optional
from datetime import date
from decimal import Decimal
from pydantic import BaseModel

# Cách gom nhóm bảng thu - chi - lợi nhuận theo thời gian:
# day -> từng ngày trong khoảng ngày, month / quarter -> 12 tháng / 4 quý của một năm, year -> mọi năm có dữ liệu
GroupBy = Literal["day", "month", "quarter", "year"]
# Gom theo ngày tạo một cột mỗi ngày nên giới hạn độ dài khoảng ngày của bảng thống kê chéo
MAX_DETAIL_DAYS = 92

class ReportFilter(BaseModel):
    from_date: date             # Khoảng ngày của bảng tổng tiền hóa đơn
    to_date: date
    time_from_date: date        # Khoảng ngày của bảng thu - chi khi xem theo ngày
    time_to_date: date
    time_year: int              # Năm của bảng thu - chi khi xem theo tháng / quý
    group_by: GroupBy = "month"
    detail_from_date: date      # Khoảng ngày của các bảng nhân viên / khách hàng / sản phẩm
    detail_to_date: date
    detail_group_by: GroupBy = "month"    # Mỗi cột của các bảng đó là một ngày / tháng / quý / năm

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

class ProductSaleOut(BaseModel):
    """Doanh thu một sản phẩm trong khoảng ngày lọc (dùng cho biểu đồ)"""
    name: str
    category: str
    quantity: int
    amount: Decimal             # Tiền bánh = đơn giá x số lượng (trước giảm giá voucher)

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
    detail_from_date: date
    detail_to_date: date
    detail_group_by: GroupBy
    # Thu - chi theo năm không theo khoảng ngày mà liệt kê đủ mọi năm từ first_year đến last_year
    first_year: int
    last_year: int
    summary: ReportSummaryOut
    product_sales: List[ProductSaleOut]    # Theo khoảng ngày from_date - to_date, giảm dần theo tiền
    by_time: List[TimeRowOut]
    by_staff: PivotTableOut
    by_customer: PivotTableOut
    by_product: PivotTableOut

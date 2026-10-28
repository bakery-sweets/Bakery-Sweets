import io
from datetime import datetime
from typing import Callable, List, Optional, Sequence

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet

from app.core.labels import PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS
from app.schemas.admin.report import PivotTableOut, RevenueReportOut
from app.services.export.text import date_only
from thesweets_common.models.order import Order

PINK = "DE5D7C"
PINK_SOFT = "FFF0F4"
INK = "1E293B"
MUTED = "64748B"
LINE = "E2E8F0"
ZEBRA = "FAFAFB"
BLUE = "3B82F6"

MONEY = '#,##0" đ"'
# Lợi nhuận âm hiện màu đỏ
PROFIT = '#,##0" đ";[Red]-#,##0" đ"'
INTEGER = "#,##0"
DATETIME = "dd/mm/yyyy hh:mm"

THIN = Side(style="thin", color=LINE)
HEADER_FILL = PatternFill("solid", fgColor=PINK)
SOFT_FILL = PatternFill("solid", fgColor=PINK_SOFT)
ZEBRA_FILL = PatternFill("solid", fgColor=ZEBRA)

def _font(size: float = 11, bold: bool = False, color: str = INK, italic: bool = False) -> Font:
    return Font(name="Calibri", size=size, bold=bold, color=color, italic=italic)

def _widths(ws: Worksheet, widths: Sequence[float]):
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

def _title(ws: Worksheet, title: str, subtitle: str, last_col: int):
    """Dải tiêu đề nền hồng + dòng mô tả kỳ báo cáo + thời điểm xuất"""
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=last_col)
    cell = ws.cell(row=1, column=1, value=title)
    cell.font = _font(16, True, "FFFFFF")
    cell.fill = HEADER_FILL
    cell.alignment = Alignment(vertical="center", indent=1)
    ws.row_dimensions[1].height = 34

    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=last_col)
    ws.cell(row=2, column=1, value=subtitle).font = _font(10.5, color=MUTED)
    ws.merge_cells(start_row=3, start_column=1, end_row=3, end_column=last_col)
    ws.cell(row=3, column=1, value=f"The Sweets · Xuất lúc {datetime.now():%H:%M %d/%m/%Y}").font = _font(9.5, color=MUTED, italic=True)

def _section(ws: Worksheet, row: int, text: str):
    ws.cell(row=row, column=1, value=text).font = _font(12.5, True, PINK)
    ws.row_dimensions[row].height = 22

def _table(
    ws: Worksheet,
    top: int,
    headers: Sequence[str],
    rows: Sequence[Sequence],
    formats: Sequence[Optional[str]],
    total: Optional[Sequence] = None,
    highlight: Optional[Callable[[int], bool]] = None,
) -> int:
    """
    Ghi bảng bắt đầu ở hàng `top`, cột A. Trả về hàng cuối cùng của bảng.
    `total`: giá trị dòng tổng; chuỗi bắt đầu bằng '=' là công thức, '{col}' được thay bằng chữ cái cột.
    """
    for c, text in enumerate(headers, start=1):
        cell = ws.cell(row=top, column=c, value=text)
        cell.font = _font(10.5, True, "FFFFFF")
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = Border(bottom=THIN)
    ws.row_dimensions[top].height = 24

    first = top + 1
    for i, values in enumerate(rows):
        r = first + i
        is_hl = bool(highlight and highlight(i))
        for c, value in enumerate(values, start=1):
            cell = ws.cell(row=r, column=c, value=value)
            fmt = formats[c - 1]
            if fmt:
                cell.number_format = fmt
            cell.font = _font(10.5, bold=is_hl, color=PINK if is_hl and c <= 2 else INK)
            cell.fill = SOFT_FILL if is_hl else (ZEBRA_FILL if i % 2 else PatternFill())
            cell.border = Border(bottom=THIN)
            cell.alignment = Alignment(vertical="center", horizontal="right" if fmt else "left", wrap_text=fmt is None)
    last = first + len(rows) - 1

    if total is not None:
        last += 1
        for c, value in enumerate(total, start=1):
            col = get_column_letter(c)
            if isinstance(value, str) and value.startswith("="):
                value = value.replace("{col}", col).replace("{first}", str(first)).replace("{last}", str(last - 1))
            cell = ws.cell(row=last, column=c, value=value)
            if formats[c - 1]:
                cell.number_format = formats[c - 1]
            cell.font = _font(10.5, True)
            cell.fill = SOFT_FILL
            cell.border = Border(top=Side(style="thin", color=PINK), bottom=Side(style="thin", color=PINK))
            cell.alignment = Alignment(vertical="center", horizontal="right" if formats[c - 1] else "left")
    return last

def _setup_print(ws: Worksheet, freeze: Optional[str] = None):
    ws.sheet_view.showGridLines = False
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    if freeze:
        ws.freeze_panes = freeze

SUM_COL = "=SUM({col}{first}:{col}{last})"
GROUP_LABELS = {"day": "ngày", "month": "tháng", "quarter": "quý", "year": "năm"}

def _pivot_sheet(
    ws: Worksheet, title: str, subtitle: str, section: str, pivot: PivotTableOut,
    name_header: str, sub_header: str, count_header: str, note: str,
):
    """Bảng thống kê chéo: STT | tên | SĐT/danh mục | từng kỳ ... | tổng cộng | số HĐ/số lượng"""
    n = len(pivot.columns)
    headers = ["STT", name_header, sub_header, *pivot.columns, "Tổng cộng", count_header]
    _widths(ws, [7, 30, 16, *[17] * n, 19, 13])
    _title(ws, title, subtitle, len(headers))
    _section(ws, 5, section)

    rows = [
        [i + 1, r.name, r.sub or "", *[float(v) for v in r.values], float(r.total), r.count]
        for i, r in enumerate(pivot.rows)
    ]
    last = _table(
        ws, 6, headers, rows, [INTEGER, None, None, *[MONEY] * n, MONEY, INTEGER],
        total=["", "Tổng cộng", "", *[SUM_COL] * (n + 2)] if rows else None,
    )
    if rows:
        for r in range(7, 7 + len(rows)):
            ws.cell(row=r, column=1).alignment = Alignment(horizontal="center", vertical="center")
            ws.cell(row=r, column=n + 4).font = _font(10.5, True, PINK)
        ws.auto_filter.ref = f"A6:{get_column_letter(len(headers))}{6 + len(rows)}"
    else:
        ws.cell(row=7, column=1, value="Chưa có hóa đơn trong khoảng thời gian này.").font = _font(10, color=MUTED, italic=True)
        last = 7
    ws.cell(row=last + 2, column=1, value=note).font = _font(9, color=MUTED, italic=True)
    _setup_print(ws, freeze="D7")

class ExcelExportService:
    @staticmethod
    def revenue_report(report: RevenueReportOut, orders: List[Order]) -> bytes:
        wb = Workbook()
        range_text = f"từ {date_only(report.from_date)} đến {date_only(report.to_date)}"
        subtitle = f"Kỳ báo cáo {range_text} · Hóa đơn = đơn hàng đã hoàn tất · Chi = phiếu nhập hàng đã hoàn tất"
        # Các bảng theo quý / năm liệt kê mọi quý / năm có dữ liệu, không theo khoảng ngày
        years_text = (
            f"năm {report.first_year}" if report.first_year == report.last_year
            else f"từ năm {report.first_year} đến năm {report.last_year}"
        )
        all_subtitle = f"Toàn bộ dữ liệu {years_text} · Hóa đơn = đơn hàng đã hoàn tất · Chi = phiếu nhập hàng đã hoàn tất"
        s = report.summary

        # ---------------- Sheet 1: Tổng hợp ----------------
        ws = wb.active
        ws.title = "Tổng hợp"
        _widths(ws, [40, 22, 40])
        _title(ws, "BÁO CÁO DOANH THU", subtitle, 3)
        _section(ws, 5, f"Tổng tiền hóa đơn {range_text}")
        summary_rows = [
            ("Số hóa đơn (đơn hoàn tất)", s.invoice_count, f"{s.cancelled_count} đơn bị hủy trong kỳ", INTEGER),
            ("Số bánh bán ra", s.items_sold, "", INTEGER),
            ("Tổng tiền hàng (trước giảm giá)", float(s.gross_amount), "", MONEY),
            ("Giảm giá voucher", float(s.discount_amount), "", MONEY),
            ("Tổng tiền hóa đơn (Tổng thu)", float(s.revenue), "Tiền hàng − giảm giá", MONEY),
            ("Tổng chi (nhập hàng)", float(s.expense), f"{s.import_count} phiếu nhập hoàn tất", MONEY),
            ("Lợi nhuận", float(s.profit), "Tổng thu − tổng chi", PROFIT),
        ]
        _table(
            ws, 6, ["Chỉ tiêu", "Giá trị", "Ghi chú"], [r[:3] for r in summary_rows], [None, MONEY, None],
            highlight=lambda i: i in (4, 6),
        )
        # Bảng chỉ tiêu trộn số lượng và tiền nên định dạng theo từng dòng
        for i, r in enumerate(summary_rows):
            ws.cell(row=7 + i, column=2).number_format = r[3]
        _setup_print(ws)

        # ---------------- Sheet 2: Thu chi theo thời gian ----------------
        ws = wb.create_sheet("Theo thời gian")
        group = GROUP_LABELS[report.group_by]
        _widths(ws, [20, 13, 20, 15, 20, 20])
        if report.group_by == "day":
            time_subtitle = subtitle.replace(range_text, f"từ {date_only(report.time_from_date)} đến {date_only(report.time_to_date)}")
        elif report.group_by == "year":
            time_subtitle = all_subtitle
        else:
            time_subtitle = subtitle.replace(range_text, f"năm {report.time_year}")
        _title(ws, f"THU – CHI – LỢI NHUẬN THEO {group.upper()}", time_subtitle, 6)
        _section(ws, 5, f"Tổng tiền hóa đơn theo {group}")
        time_rows = [
            [t.label, t.invoice_count, float(t.revenue), t.import_count, float(t.expense), float(t.profit)]
            for t in report.by_time
        ]
        last = _table(
            ws, 6, ["Thời gian", "Số hóa đơn", "Tổng thu", "Số phiếu nhập", "Tổng chi", "Lợi nhuận"], time_rows,
            [None, INTEGER, MONEY, INTEGER, MONEY, PROFIT],
            total=["Tổng cộng", *[SUM_COL] * 5],
        )
        if 1 < len(time_rows) <= 36:
            bar = BarChart()
            bar.type = "col"
            bar.title = f"Tổng thu và tổng chi theo {group}"
            bar.y_axis.numFmt = "#,##0"
            # openpyxl mặc định ẩn trục trên Excel bản mới, phải bật lại
            bar.x_axis.delete = False
            bar.y_axis.delete = False
            for col, color in ((3, PINK), (5, BLUE)):
                bar.add_data(Reference(ws, min_col=col, min_row=6, max_row=6 + len(time_rows)), titles_from_data=True)
                bar.series[-1].graphicalProperties.solidFill = color
                bar.series[-1].graphicalProperties.line.solidFill = color
            bar.set_categories(Reference(ws, min_col=1, min_row=7, max_row=6 + len(time_rows)))
            bar.width, bar.height = 22, 10
            ws.add_chart(bar, f"A{last + 3}")
        _setup_print(ws, freeze="B7")

        # ---------------- Sheet 3-5: Thống kê chéo ----------------
        _pivot_sheet(
            wb.create_sheet("Theo nhân viên"), "THỐNG KÊ HÓA ĐƠN THEO NHÂN VIÊN", all_subtitle,
            "Tổng tiền hóa đơn theo nhân viên và năm", report.by_staff, "Nhân viên", "SĐT", "Số hóa đơn",
            "Nhân viên lập hóa đơn là người chuyển đơn sang trạng thái Hoàn tất.",
        )
        _pivot_sheet(
            wb.create_sheet("Theo khách hàng"), "THỐNG KÊ HÓA ĐƠN THEO KHÁCH HÀNG", all_subtitle,
            f"Tổng tiền hóa đơn theo khách hàng và {GROUP_LABELS[report.customer_group_by]}", report.by_customer,
            "Khách hàng", "SĐT", "Số hóa đơn", "Sắp xếp theo tổng tiền giảm dần.",
        )
        _pivot_sheet(
            wb.create_sheet("Theo sản phẩm"), "THỐNG KÊ HÓA ĐƠN THEO SẢN PHẨM", all_subtitle,
            "Tổng tiền hóa đơn theo sản phẩm và quý", report.by_product, "Sản phẩm", "Danh mục", "SL bán",
            "Tiền bánh = đơn giá × số lượng trên hóa đơn (trước giảm giá voucher).",
        )

        # ---------------- Sheet 6: Danh sách hóa đơn ----------------
        ws = wb.create_sheet("Hóa đơn")
        _widths(ws, [14, 17, 22, 13, 9, 15, 14, 13, 15, 15, 16, 48])
        _title(ws, "DANH SÁCH HÓA ĐƠN", subtitle, 12)
        order_rows = []
        for o in orders:
            promo = o.promotion
            items = ", ".join(
                f"{d.quantity}x {d.product.product_name if d.product else d.product_id}"
                f"{f' ({d.size.size_name})' if d.size else ''}"
                for d in o.details
            )
            order_rows.append([
                o.order_code, o.order_date, o.recipient_name, o.recipient_phone, o.total_quantity,
                float(o.total_cost), float(o.discount_amount or 0), promo.promotion_code if promo else "",
                float(o.final_cost), PAYMENT_METHOD_LABELS.get(o.payment_method, o.payment_method),
                PAYMENT_STATUS_LABELS.get(o.payment_status, o.payment_status), items,
            ])
        _table(
            ws, 5,
            ["Mã đơn", "Ngày đặt", "Khách hàng", "SĐT", "Số bánh", "Tạm tính", "Giảm giá", "Voucher", "Thành tiền", "Thanh toán", "Trạng thái TT", "Chi tiết"],
            order_rows,
            [None, DATETIME, None, None, INTEGER, MONEY, MONEY, None, MONEY, None, None, None],
            total=["Tổng cộng", "", "", "", SUM_COL, SUM_COL, SUM_COL, "", SUM_COL, "", "", ""] if order_rows else None,
        )
        for r in range(6, 6 + len(order_rows)):
            ws.cell(row=r, column=2).alignment = Alignment(horizontal="center", vertical="center")
        if order_rows:
            ws.auto_filter.ref = f"A5:L{5 + len(order_rows)}"
        else:
            ws.cell(row=6, column=1, value="Chưa có hóa đơn trong khoảng thời gian này.").font = _font(10, color=MUTED, italic=True)
        _setup_print(ws, freeze="B6")

        buffer = io.BytesIO()
        wb.save(buffer)
        return buffer.getvalue()


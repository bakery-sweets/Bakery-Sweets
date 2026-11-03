import io
import os
from datetime import datetime
from typing import List, Optional, Sequence
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.labels import (
    ORDER_STATUS_LABELS,
    PAYMENT_METHOD_LABELS,
    PAYMENT_STATUS_LABELS,
)
from app.services.export.text import date_time, money, money_in_words
from thesweets_common.models.import_receipt import ImportReceipt
from thesweets_common.models.order import Order

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")

# Thông tin đơn vị in trên chứng từ (đồng bộ với trang thanh toán & trang cá nhân của App)
SHOP_NAME = "THE SWEETS"
SHOP_LEGAL_NAME = "TIỆM BÁNH THE SWEETS"
SHOP_ADDRESS = "120 Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"
SHOP_PHONE = "1900 6868"
SHOP_WAREHOUSE = "Kho thành phẩm The Sweets"
UNIT = "Cái"

# Mẫu số 01-VT, Phụ lục I Thông tư 99/2025/TT-BTC (thay Thông tư 200/2014/TT-BTC từ 01/01/2026)
IMPORT_FORM_CODE = "Mẫu số 01 - VT"
IMPORT_FORM_BASIS = "(Kèm theo Thông tư số 99/2025/TT-BTC ngày 27/10/2025 của Bộ trưởng Bộ Tài chính)"
# Bút toán mặc định khi mua hàng hóa của nhà cung cấp: Nợ TK 156 (Hàng hóa) / Có TK 331 (Phải trả người bán)
IMPORT_DEBIT_ACCOUNT = "156"
IMPORT_CREDIT_ACCOUNT = "331"

PAGE_W, PAGE_H = A4
MARGIN = 15 * mm
# Frame của SimpleDocTemplate có padding 6pt mỗi bên, trừ ra để bảng thẳng hàng với đoạn văn
CONTENT_W = PAGE_W - 2 * MARGIN - 12

# Chứng từ kế toán in đen trắng; màu chỉ dùng cho dấu trạng thái để nhìn là biết
INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#4B5563")
GRID = colors.HexColor("#374151")
HEAD_BG = colors.HexColor("#F3F4F6")
GREEN = colors.HexColor("#059669")
AMBER = colors.HexColor("#D97706")
RED = colors.HexColor("#DC2626")

# Font Be Vietnam Pro (OFL) để hiển thị đủ dấu tiếng Việt
FONT, FONT_SEMI, FONT_BOLD = "BeVietnamPro", "BeVietnamPro-SemiBold", "BeVietnamPro-Bold"
_fonts_registered = False

def _register_fonts():
    global _fonts_registered
    if _fonts_registered:
        return
    fonts_dir = os.path.join(ASSETS_DIR, "fonts")
    for name, file in ((FONT, "BeVietnamPro-Regular.ttf"), (FONT_SEMI, "BeVietnamPro-SemiBold.ttf"), (FONT_BOLD, "BeVietnamPro-Bold.ttf")):
        pdfmetrics.registerFont(TTFont(name, os.path.join(fonts_dir, file)))
    pdfmetrics.registerFontFamily(FONT, normal=FONT, bold=FONT_BOLD, italic=FONT, boldItalic=FONT_BOLD)
    _fonts_registered = True

def _style(name: str, size: float = 9.5, font: str = FONT, color=INK, align=TA_LEFT, leading: Optional[float] = None) -> ParagraphStyle:
    return ParagraphStyle(name, fontName=font, fontSize=size, leading=leading or size * 1.4, textColor=color, alignment=align)

def _p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(text or ""), style)

def _rich(html: str, style: ParagraphStyle) -> Paragraph:
    """Đoạn văn có sẵn thẻ <b>; phần dữ liệu bên trong phải được escape trước khi ghép"""
    return Paragraph(html, style)

class _Styles:
    def __init__(self):
        _register_fonts()
        self.body = _style("body", 9.5)
        self.body_right = _style("body_right", 9.5, align=TA_RIGHT)
        self.unit = _style("unit", 9, FONT_SEMI)
        self.unit_muted = _style("unit_muted", 8.5, color=MUTED)
        self.form_code = _style("form_code", 9.5, FONT_BOLD, align=TA_CENTER)
        self.form_basis = _style("form_basis", 7.5, color=MUTED, align=TA_CENTER, leading=10)
        self.title = _style("title", 17, FONT_BOLD, align=TA_CENTER, leading=22)
        self.date_center = _style("date_center", 9.5, align=TA_CENTER)
        self.meta_right = _style("meta_right", 9.5, align=TA_LEFT)
        self.th = _style("th", 8.5, FONT_BOLD, align=TA_CENTER, leading=11)
        self.th_index = _style("th_index", 8, FONT_SEMI, MUTED, TA_CENTER)
        self.td = _style("td", 9)
        self.td_right = _style("td_right", 9, align=TA_RIGHT)
        self.td_center = _style("td_center", 9, align=TA_CENTER)
        self.td_bold = _style("td_bold", 9, FONT_BOLD)
        self.td_bold_right = _style("td_bold_right", 9, FONT_BOLD, align=TA_RIGHT)
        self.td_bold_center = _style("td_bold_center", 9, FONT_BOLD, align=TA_CENTER)
        self.td_note = _style("td_note", 7.5, color=MUTED)
        self.sign_date = _style("sign_date", 9.5, align=TA_CENTER)
        self.sign_date_right = _style("sign_date_right", 9.5, align=TA_RIGHT)
        self.sign_title = _style("sign_title", 9.5, FONT_BOLD, align=TA_CENTER, leading=12)
        self.sign_hint = _style("sign_hint", 8, color=MUTED, align=TA_CENTER)
        self.thanks = _style("thanks", 9.5, FONT_SEMI, align=TA_CENTER)

    def stamp(self, color) -> ParagraphStyle:
        return _style("stamp", 9.5, FONT_BOLD, color, TA_CENTER)

def _logo(width: float) -> object:
    """Logo chữ The Sweets, giữ đúng tỉ lệ ảnh gốc"""
    path = os.path.join(ASSETS_DIR, "logo.png")
    if not os.path.exists(path):
        return ""
    logo = Image(path)
    logo.drawHeight = width * logo.imageHeight / logo.imageWidth
    logo.drawWidth = width
    logo.hAlign = "LEFT"
    return logo

def _vn_date(value: Optional[datetime]) -> str:
    """Ngày 05 tháng 11 năm 2026 (cách ghi ngày trên chứng từ kế toán)"""
    if not value:
        return "Ngày ...... tháng ...... năm ........"
    return f"Ngày {value:%d} tháng {value:%m} năm {value:%Y}"

def _plain_table(rows: list, widths: Sequence[float], extra: Sequence[tuple] = ()) -> Table:
    table = Table(rows, colWidths=widths)
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        *extra,
    ]))
    return table

def _unit_block(s: _Styles, extra_lines: Sequence[str] = ()) -> list:
    """Khối "Đơn vị" góc trên bên trái: logo + tên, địa chỉ, điện thoại"""
    return [
        _logo(30 * mm),
        Spacer(1, 3),
        _rich(f"Đơn vị: <b>{escape(SHOP_LEGAL_NAME)}</b>", s.unit),
        _p(f"Địa chỉ: {SHOP_ADDRESS}", s.unit_muted),
        _p(f"Điện thoại: {SHOP_PHONE}", s.unit_muted),
        *[_p(line, s.unit_muted) for line in extra_lines],
    ]

def _grid_table(s: _Styles, header: list, index_row: Sequence[str], rows: List[list], widths: Sequence[float],
                total_rows: int = 1, header_spans: Sequence[tuple] = ()) -> Table:
    """
    Bảng kẻ ô đầy đủ theo mẫu chứng từ: dòng tiêu đề, dòng ký hiệu cột (A, B, 1, 2...),
    các dòng hàng và [total_rows] dòng cộng in đậm ở cuối
    """
    header_rows = header if isinstance(header[0], list) else [header]
    data = header_rows + [[_p(t, s.th_index) for t in index_row]] + rows
    n_head = len(header_rows) + 1
    table = Table(data, colWidths=widths, repeatRows=n_head)
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.6, GRID),
        ("BACKGROUND", (0, 0), (-1, len(header_rows) - 1), HEAD_BG),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, n_head - 1), (-1, n_head - 1), 1),
        ("BOTTOMPADDING", (0, n_head - 1), (-1, n_head - 1), 2),
        *header_spans,
    ]))
    return table

def _stamp(s: _Styles, text: str, color) -> Table:
    table = Table([[_p(text, s.stamp(color))]], colWidths=[48 * mm], hAlign="RIGHT")
    table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 1.3, color),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table

def _signatures(s: _Styles, signers: Sequence[tuple], date_value: Optional[datetime]) -> Table:
    """Khối chữ ký: dòng ngày tháng ở cột cuối, mỗi cột gồm chức danh + (Ký, họ tên) + chỗ trống để ký"""
    n = len(signers)
    # Dòng ngày nằm phía trên cột chữ ký cuối; nhiều cột thì gộp 2 cột cuối cho đủ chỗ, khỏi xuống dòng
    date_cols = 2 if n >= 3 else 1
    date_row = [""] * (n - 1) + [_p(_vn_date(date_value), s.sign_date)]
    if date_cols == 2:
        date_row = [""] * (n - 2) + [_p(_vn_date(date_value), s.sign_date_right), ""]
    # Chức danh là hằng số trong code (không phải dữ liệu người dùng) nên cho phép <br/> để xuống dòng
    title_row = [_rich(title, s.sign_title) for title, _ in signers]
    hint_row = [_p(hint, s.sign_hint) for _, hint in signers]
    table = Table(
        [date_row, title_row, hint_row, [""] * n],
        colWidths=[CONTENT_W / n] * n,
        rowHeights=[None, None, None, 24 * mm],
    )
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        *([("SPAN", (n - 2, 0), (n - 1, 0))] if date_cols == 2 else []),
    ]))
    return table

def _build(story: list, footer_text: str) -> bytes:
    buffer = io.BytesIO()
    printed_at = f"In lúc {datetime.now():%H:%M %d/%m/%Y}"

    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setFont(FONT, 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(MARGIN, 8 * mm, f"{SHOP_NAME} · {footer_text}")
        canvas.drawRightString(PAGE_W - MARGIN, 8 * mm, f"{printed_at} · Trang {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN, topMargin=12 * mm, bottomMargin=16 * mm,
        title=footer_text, author=SHOP_NAME,
    )
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return buffer.getvalue()

class PdfExportService:
    @staticmethod
    def order_invoice(order: Order) -> bytes:
        """Hóa đơn bán hàng của một đơn (bố cục theo mẫu hóa đơn bán hàng thông dụng)"""
        s = _Styles()
        promo = order.promotion
        if not promo and order.applied_promotions:
            promo = order.applied_promotions[0].promotion

        # 1. Đầu hóa đơn: đơn vị bán bên trái, số hóa đơn bên phải
        right = [
            _rich(f"Số: <b>{escape(order.order_code or '')}</b>", s.meta_right),
            _p(f"Ngày đặt: {date_time(order.order_date)}", s.meta_right),
        ]
        story = [
            _plain_table([[_unit_block(s), right]], [CONTENT_W - 58 * mm, 58 * mm], [("VALIGN", (1, 0), (1, 0), "BOTTOM")]),
            Spacer(1, 10),
            _p("HÓA ĐƠN BÁN HÀNG", s.title),
            _p(_vn_date(order.order_date), s.date_center),
            Spacer(1, 10),
        ]

        # 2. Thông tin người mua
        buyer = [
            ("Họ tên người mua hàng", order.recipient_name),
            ("Số điện thoại", order.recipient_phone),
            ("Hình thức nhận hàng", f"Nhận tại cửa hàng lúc {date_time(order.pickup_time)}"),
            ("Hình thức thanh toán", PAYMENT_METHOD_LABELS.get(order.payment_method, order.payment_method)),
        ]
        story.append(_plain_table(
            [[_p(f"{label}:", s.body), _rich(f"<b>{escape(value or '—')}</b>", s.body)] for label, value in buyer],
            [44 * mm, CONTENT_W - 44 * mm],
        ))
        story.append(Spacer(1, 8))

        # 3. Bảng hàng hóa: A, B, C, 1, 2, 3 = 1 x 2
        rows = []
        for i, d in enumerate(order.details, start=1):
            name = d.product.product_name if d.product else f"#{d.product_id}"
            size = d.size.size_name if d.size else ""
            cell = [_p(f"{name} - {size}" if size else name, s.td)]
            if d.note:
                cell.append(_p(f"Ghi chú: {d.note}", s.td_note))
            rows.append([
                _p(str(i), s.td_center), cell, _p(UNIT, s.td_center),
                _p(str(d.quantity), s.td_center), _p(money(d.price, ""), s.td_right), _p(money(d.price * d.quantity, ""), s.td_right),
            ])

        has_discount = bool(order.discount_amount and order.discount_amount > 0)
        total_lines = [("Cộng tiền hàng", money(order.total_cost, ""), str(order.total_quantity))]
        if has_discount:
            label = f"Giảm giá voucher ({promo.promotion_code})" if promo else "Giảm giá"
            total_lines.append((label, "-" + money(order.discount_amount, ""), ""))
        total_lines.append(("Tổng cộng tiền thanh toán", money(order.final_cost, ""), ""))
        for label, value, qty in total_lines:
            rows.append(["", _p(label, s.td_bold), "", _p(qty, s.td_bold_center), "", _p(value, s.td_bold_right)])

        first_total = len(rows) - len(total_lines) + 2  # +2: dòng tiêu đề và dòng ký hiệu cột
        spans = [("SPAN", (1, r), (2, r)) for r in range(first_total, first_total + len(total_lines))]
        table = _grid_table(
            s,
            [_p(t, s.th) for t in ("STT", "Tên hàng hóa, dịch vụ", "Đơn vị tính", "Số lượng", "Đơn giá", "Thành tiền")],
            ["A", "B", "C", "1", "2", "3 = 1 x 2"],
            rows,
            [11 * mm, CONTENT_W - 117 * mm, 20 * mm, 20 * mm, 30 * mm, 36 * mm],
            header_spans=spans,
        )
        story.append(table)
        story.append(Spacer(1, 6))
        story.append(_rich(f"Số tiền viết bằng chữ: <b>{escape(money_in_words(order.final_cost))}</b>", s.body))

        if order.notes:
            story += [Spacer(1, 4), _p(f"Ghi chú đơn hàng: {order.notes}", s.body)]

        # 4. Dấu trạng thái + chữ ký
        if order.status == "Cancelled":
            stamp = _stamp(s, "ĐƠN HÀNG ĐÃ HỦY", RED)
        elif order.payment_status == "Paid":
            stamp = _stamp(s, PAYMENT_STATUS_LABELS.get("Paid", "ĐÃ THANH TOÁN").upper(), GREEN)
        else:
            stamp = _stamp(s, PAYMENT_STATUS_LABELS.get(order.payment_status, "CHƯA THANH TOÁN").upper(), AMBER)

        story += [
            Spacer(1, 8),
            stamp,
            Spacer(1, 8),
            KeepTogether([
                _signatures(s, [("Người mua hàng", "(Ký, ghi rõ họ tên)"), ("Người bán hàng", "(Ký, ghi rõ họ tên)")], order.order_date),
            ]),
            Spacer(1, 6),
            _p(f"Trạng thái đơn: {ORDER_STATUS_LABELS.get(order.status, order.status)} · Cảm ơn quý khách đã lựa chọn The Sweets!", s.thanks),
        ]
        return _build(story, f"Hóa đơn {order.order_code}")

    @staticmethod
    def import_receipt(receipt: ImportReceipt) -> bytes:
        """Phiếu nhập kho theo Mẫu số 01-VT (Thông tư 99/2025/TT-BTC)"""
        s = _Styles()
        sup = receipt.supplier
        completed = receipt.status == "Completed"

        # 1. Đầu phiếu: Đơn vị / Bộ phận bên trái, mẫu số bên phải
        form = [_p(IMPORT_FORM_CODE, s.form_code), _p(IMPORT_FORM_BASIS, s.form_basis)]
        story = [
            _plain_table([[_unit_block(s, ["Bộ phận: Kho hàng"]), form]], [CONTENT_W - 72 * mm, 72 * mm]),
            Spacer(1, 8),
        ]

        # 2. Tiêu đề, ngày, số phiếu và tài khoản Nợ / Có
        center = [_p("PHIẾU NHẬP KHO", s.title), _p(_vn_date(receipt.import_date), s.date_center),
                  _rich(f"Số: <b>{escape(receipt.import_code)}</b>", s.date_center)]
        accounts = [_p(f"Nợ: {IMPORT_DEBIT_ACCOUNT}", s.body), _p(f"Có: {IMPORT_CREDIT_ACCOUNT}", s.body)]
        story.append(_plain_table(
            [["", center, accounts]],
            [38 * mm, CONTENT_W - 76 * mm, 38 * mm],
            [("VALIGN", (2, 0), (2, 0), "BOTTOM"), ("LEFTPADDING", (2, 0), (2, 0), 14)],
        ))
        story.append(Spacer(1, 8))

        # 3. Người giao, chứng từ căn cứ, kho nhập
        deliverer = (sup.contact_name if sup else None) or "........................................"
        sup_name = f"{sup.supplier_name} ({sup.supplier_code})" if sup else "........................................"
        sup_extra = " · ".join(x for x in [(sup.phone if sup else None), (sup.address if sup else None)] if x)
        lines = [
            f"- Họ và tên người giao: <b>{escape(deliverer)}</b>",
            f"- Đơn vị giao hàng: <b>{escape(sup_name)}</b>" + (f" — {escape(sup_extra)}" if sup_extra else ""),
            "- Theo hóa đơn số .................... ngày ...... tháng ...... năm ........ của " + escape(sup.supplier_name if sup else "...................."),
            f"- Nhập tại kho: <b>{escape(SHOP_WAREHOUSE)}</b>      Địa điểm: {escape(SHOP_ADDRESS)}",
        ]
        for line in lines:
            story.append(_rich(line, s.body))
        story.append(Spacer(1, 8))

        # 4. Bảng hàng nhập: STT | Tên, quy cách | Mã số | ĐVT | Số lượng (Theo chứng từ, Thực nhập) | Đơn giá | Thành tiền
        rows = []
        for i, d in enumerate(receipt.details, start=1):
            name = d.product.product_name if d.product else f"#{d.product_id}"
            size = d.size.size_name if d.size else ""
            cell = [_p(f"{name} - {size}" if size else name, s.td)]
            if d.note:
                cell.append(_p(f"Ghi chú: {d.note}", s.td_note))
            rows.append([
                _p(str(i), s.td_center),
                cell,
                _p(f"SP{d.product_id:03d}-{d.size_id}", s.td_center),
                _p(UNIT, s.td_center),
                _p(str(d.quantity), s.td_center),
                # Thực nhập chỉ có khi phiếu đã nhập kho; phiếu chờ nhập để trống cho thủ kho ghi tay
                _p(str(d.quantity) if completed else "", s.td_center),
                _p(money(d.import_price, ""), s.td_right),
                _p(money(d.total_price, ""), s.td_right),
            ])
        total_qty = sum(d.quantity for d in receipt.details)
        # Cộng từ chính các dòng in trên phiếu để dòng "Cộng" luôn khớp với bảng
        total_amount = sum((d.total_price for d in receipt.details), 0)
        rows.append([
            "", _p("Cộng", s.td_bold_center), _p("x", s.td_center), _p("x", s.td_center),
            _p(str(total_qty), s.td_bold_center), _p(str(total_qty) if completed else "", s.td_bold_center),
            _p("x", s.td_center), _p(money(total_amount, ""), s.td_bold_right),
        ])

        header = [
            [_p("STT", s.th), _p("Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ, sản phẩm, hàng hóa", s.th),
             _p("Mã số", s.th), _p("Đơn vị tính", s.th), _p("Số lượng", s.th), "", _p("Đơn giá", s.th), _p("Thành tiền", s.th)],
            ["", "", "", "", _p("Theo chứng từ", s.th), _p("Thực nhập", s.th), "", ""],
        ]
        spans = [
            ("SPAN", (0, 0), (0, 1)), ("SPAN", (1, 0), (1, 1)), ("SPAN", (2, 0), (2, 1)), ("SPAN", (3, 0), (3, 1)),
            ("SPAN", (4, 0), (5, 0)), ("SPAN", (6, 0), (6, 1)), ("SPAN", (7, 0), (7, 1)),
        ]
        story.append(_grid_table(
            s, header, ["A", "B", "C", "D", "1", "2", "3", "4"], rows,
            [10 * mm, CONTENT_W - 128 * mm, 20 * mm, 15 * mm, 20 * mm, 19 * mm, 21 * mm, 23 * mm],
            header_spans=spans,
        ))
        story.append(Spacer(1, 6))

        # 5. Tổng tiền bằng chữ, chứng từ kèm theo, ghi chú
        story.append(_rich(f"- Tổng số tiền (viết bằng chữ): <b>{escape(money_in_words(total_amount))}</b>", s.body))
        story.append(_p("- Số chứng từ gốc kèm theo: ....................................................", s.body))
        if receipt.notes:
            story.append(_p(f"- Ghi chú: {receipt.notes}", s.body))

        # Phiếu chưa nhập kho / đã hủy thì đóng dấu để không nhầm với phiếu đã nhập
        if not completed:
            text, color = ("PHIẾU ĐÃ HỦY", RED) if receipt.status == "Cancelled" else ("CHỜ NHẬP KHO", AMBER)
            story += [Spacer(1, 6), _stamp(s, text, color)]

        # 6. Chữ ký theo mẫu 01-VT
        signers = [
            ("Người lập phiếu", "(Ký, họ tên)"),
            ("Người giao hàng", "(Ký, họ tên)"),
            ("Thủ kho", "(Ký, họ tên)"),
            ("Kế toán trưởng<br/>(Hoặc bộ phận có nhu cầu nhập)", "(Ký, họ tên)"),
        ]
        story += [Spacer(1, 12), KeepTogether([_signatures(s, signers, receipt.import_date)])]
        return _build(story, f"Phiếu nhập kho {receipt.import_code}")

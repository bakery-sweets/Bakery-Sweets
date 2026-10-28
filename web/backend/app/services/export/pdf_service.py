import io
import os
from datetime import datetime
from typing import List, Optional, Sequence, Tuple
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.labels import (
    IMPORT_STATUS_LABELS,
    ORDER_STATUS_LABELS,
    PAYMENT_METHOD_LABELS,
    PAYMENT_STATUS_LABELS,
)
from app.services.export.text import date_time, money, money_in_words
from thesweets_common.models.import_receipt import ImportReceipt
from thesweets_common.models.order import Order

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")
SHOP_NAME = "THE SWEETS"
SHOP_TAGLINE = "Tiệm bánh ngọt thủ công"

PAGE_W, PAGE_H = A4
MARGIN = 16 * mm
# Frame của SimpleDocTemplate có padding 6pt mỗi bên, trừ ra để bảng thẳng hàng với đoạn văn
CONTENT_W = PAGE_W - 2 * MARGIN - 12

PINK = colors.HexColor("#DE5D7C")
PINK_SOFT = colors.HexColor("#FFF0F4")
INK = colors.HexColor("#1E293B")
MUTED = colors.HexColor("#64748B")
LINE = colors.HexColor("#E2E8F0")
ZEBRA = colors.HexColor("#FAFAFB")
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

def _style(name: str, size: float = 9.5, font: str = FONT, color=INK, align=None, leading: Optional[float] = None) -> ParagraphStyle:
    style = ParagraphStyle(name, fontName=font, fontSize=size, leading=leading or size * 1.38, textColor=color)
    if align is not None:
        style.alignment = align
    return style

def _p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(text or ""), style)

class _Styles:
    def __init__(self):
        _register_fonts()
        self.body = _style("body")
        self.small = _style("small", 8, color=MUTED)
        self.label = _style("label", 8.5, color=MUTED)
        self.value = _style("value", 9.5, FONT_SEMI)
        self.shop = _style("shop", 17, FONT_BOLD, PINK, leading=20)
        self.tagline = _style("tagline", 8.5, color=MUTED)
        self.title = _style("title", 16, FONT_BOLD, INK, TA_RIGHT, leading=20)
        self.meta = _style("meta", 9, color=MUTED, align=TA_RIGHT)
        self.section = _style("section", 10.5, FONT_BOLD, INK)
        self.th = _style("th", 8.5, FONT_BOLD, colors.white)
        self.th_right = _style("th_right", 8.5, FONT_BOLD, colors.white, TA_RIGHT)
        self.th_center = _style("th_center", 8.5, FONT_BOLD, colors.white, TA_CENTER)
        self.td = _style("td", 9)
        self.td_right = _style("td_right", 9, align=TA_RIGHT)
        self.td_center = _style("td_center", 9, align=TA_CENTER)
        self.td_note = _style("td_note", 7.5, color=MUTED)
        self.total_label = _style("total_label", 9.5, color=MUTED, align=TA_RIGHT)
        self.total_value = _style("total_value", 9.5, FONT_SEMI, align=TA_RIGHT)
        self.grand_label = _style("grand_label", 11, FONT_BOLD, INK, TA_RIGHT)
        self.grand_value = _style("grand_value", 13, FONT_BOLD, PINK, TA_RIGHT, leading=16)
        self.words = _style("words", 9, color=MUTED)
        self.sign_title = _style("sign_title", 9.5, FONT_BOLD, align=TA_CENTER)
        self.sign_hint = _style("sign_hint", 8, color=MUTED, align=TA_CENTER)
        self.thanks = _style("thanks", 10, FONT_SEMI, PINK, TA_CENTER)

    def stamp(self, color) -> ParagraphStyle:
        return _style("stamp", 10, FONT_BOLD, color, TA_CENTER)

def _header(s: _Styles, title: str, meta_lines: Sequence[str]) -> Table:
    logo_path = os.path.join(ASSETS_DIR, "logo.png")
    logo = Image(logo_path, width=17 * mm, height=17 * mm) if os.path.exists(logo_path) else ""
    brand = [_p(SHOP_NAME, s.shop), _p(SHOP_TAGLINE, s.tagline)]
    right = [_p(title, s.title)] + [_p(line, s.meta) for line in meta_lines]
    table = Table([[logo, brand, right]], colWidths=[20 * mm, 70 * mm, CONTENT_W - 90 * mm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("LINEBELOW", (0, 0), (-1, 0), 1.2, PINK),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 9),
    ]))
    return table

def _info_box(s: _Styles, pairs: Sequence[Tuple[str, str]]) -> Table:
    """Khối thông tin 2 cột: mỗi ô gồm nhãn nhỏ phía trên và giá trị đậm phía dưới"""
    cells = [[_p(label, s.label), _p(value, s.value)] for label, value in pairs]
    rows = [cells[i:i + 2] for i in range(0, len(cells), 2)]
    if len(rows[-1]) == 1:
        rows[-1].append("")
    table = Table(rows, colWidths=[CONTENT_W / 2] * 2)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PINK_SOFT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 9),
    ]))
    return table

def _items_table(s: _Styles, header: Sequence[Tuple[str, str]], rows: List[list], widths: Sequence[float]) -> Table:
    """Bảng chi tiết: header nền hồng, dòng xen kẽ màu, cột số căn phải"""
    head_style = {"left": s.th, "right": s.th_right, "center": s.th_center}
    data = [[_p(text, head_style[align]) for text, align in header]] + rows
    table = Table(data, colWidths=widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PINK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ZEBRA]),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table

def _name_cell(s: _Styles, name: str, note: Optional[str]) -> list:
    cell = [_p(name, s.td)]
    if note:
        cell.append(_p(f"Ghi chú: {note}", s.td_note))
    return cell

def _totals(s: _Styles, lines: Sequence[Tuple[str, str]], grand: Tuple[str, str]) -> Table:
    rows = [[_p(label, s.total_label), _p(value, s.total_value)] for label, value in lines]
    rows.append([_p(grand[0], s.grand_label), _p(grand[1], s.grand_value)])
    table = Table(rows, colWidths=[45 * mm, 42 * mm], hAlign="RIGHT")
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("LINEABOVE", (0, -1), (-1, -1), 0.8, LINE),
        ("TOPPADDING", (0, -1), (-1, -1), 7),
    ]))
    return table

def _stamp(s: _Styles, text: str, color) -> Table:
    table = Table([[_p(text, s.stamp(color))]], colWidths=[62 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 1.4, color),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table

def _note_box(s: _Styles, label: str, text: str) -> Table:
    table = Table([[Paragraph(f"<b>{escape(label)}</b> {escape(text)}", s.body)]], colWidths=[CONTENT_W])
    table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table

def _build(story: list, footer_text: str) -> bytes:
    buffer = io.BytesIO()
    printed_at = f"In lúc {datetime.now():%H:%M %d/%m/%Y}"

    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setFont(FONT, 7.5)
        canvas.setFillColor(MUTED)
        canvas.setStrokeColor(LINE)
        canvas.line(MARGIN, 12 * mm, PAGE_W - MARGIN, 12 * mm)
        canvas.drawString(MARGIN, 8 * mm, f"{SHOP_NAME} · {footer_text}")
        canvas.drawRightString(PAGE_W - MARGIN, 8 * mm, f"{printed_at} · Trang {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=18 * mm,
        title=footer_text, author=SHOP_NAME,
    )
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return buffer.getvalue()

class PdfExportService:
    @staticmethod
    def order_invoice(order: Order) -> bytes:
        """Hóa đơn bán hàng của một đơn"""
        s = _Styles()
        promo = order.promotion
        if not promo and order.applied_promotions:
            promo = order.applied_promotions[0].promotion

        story = [
            _header(s, "HÓA ĐƠN BÁN HÀNG", [f"Số: {order.order_code}", f"Ngày đặt: {date_time(order.order_date)}"]),
            Spacer(1, 10),
            _info_box(s, [
                ("Khách hàng", order.recipient_name),
                ("Số điện thoại", order.recipient_phone),
                ("Giờ nhận bánh", date_time(order.pickup_time)),
                ("Trạng thái đơn", ORDER_STATUS_LABELS.get(order.status, order.status)),
                ("Hình thức thanh toán", PAYMENT_METHOD_LABELS.get(order.payment_method, order.payment_method)),
                ("Trạng thái thanh toán", PAYMENT_STATUS_LABELS.get(order.payment_status, order.payment_status)),
            ]),
            Spacer(1, 12),
            _p("Chi tiết đơn hàng", s.section),
            Spacer(1, 5),
        ]

        rows = [
            [
                _p(str(i), s.td_center),
                _name_cell(s, d.product.product_name if d.product else f"#{d.product_id}", d.note),
                _p(d.size.size_name if d.size else "", s.td_center),
                _p(str(d.quantity), s.td_center),
                _p(money(d.price), s.td_right),
                _p(money(d.price * d.quantity), s.td_right),
            ]
            for i, d in enumerate(order.details, start=1)
        ]
        story.append(_items_table(
            s,
            [("STT", "center"), ("Tên bánh", "left"), ("Kích cỡ", "center"), ("SL", "center"), ("Đơn giá", "right"), ("Thành tiền", "right")],
            rows,
            [12 * mm, CONTENT_W - 120 * mm, 30 * mm, 14 * mm, 30 * mm, 34 * mm],
        ))

        totals = [
            ("Tổng số lượng", f"{order.total_quantity} bánh"),
            ("Tạm tính", money(order.total_cost)),
        ]
        if order.discount_amount and order.discount_amount > 0:
            label = f"Giảm giá ({promo.promotion_code})" if promo else "Giảm giá"
            totals.append((label, "-" + money(order.discount_amount)))

        if order.status == "Cancelled":
            stamp = _stamp(s, "ĐƠN HÀNG ĐÃ HỦY", RED)
        elif order.payment_status == "Paid":
            stamp = _stamp(s, "ĐÃ THANH TOÁN", GREEN)
        else:
            stamp = _stamp(s, "CHƯA THANH TOÁN", AMBER)

        summary = Table(
            [[stamp, _totals(s, totals, ("Tổng thanh toán", money(order.final_cost)))]],
            colWidths=[CONTENT_W - 90 * mm, 90 * mm],
        )
        summary.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        story += [
            Spacer(1, 10),
            KeepTogether([summary, Spacer(1, 6), _p(f"Bằng chữ: {money_in_words(order.final_cost)}.", s.words)]),
        ]

        if order.notes:
            story += [Spacer(1, 10), _note_box(s, "Ghi chú đơn hàng:", order.notes)]

        story += [Spacer(1, 22), _p("Cảm ơn quý khách đã lựa chọn The Sweets!", s.thanks)]
        return _build(story, f"Hóa đơn {order.order_code}")

    @staticmethod
    def import_receipt(receipt: ImportReceipt) -> bytes:
        """Phiếu nhập kho từ nhà cung cấp"""
        s = _Styles()
        sup = receipt.supplier
        story = [
            _header(s, "PHIẾU NHẬP KHO", [f"Số: {receipt.import_code}", f"Ngày nhập: {date_time(receipt.import_date)}"]),
            Spacer(1, 10),
            _info_box(s, [
                ("Nhà cung cấp", f"{sup.supplier_name} ({sup.supplier_code})" if sup else "—"),
                ("Người liên hệ", (sup.contact_name if sup else None) or "—"),
                ("Điện thoại", (sup.phone if sup else None) or "—"),
                ("Email", (sup.email if sup else None) or "—"),
                ("Địa chỉ", (sup.address if sup else None) or "—"),
                ("Trạng thái phiếu", IMPORT_STATUS_LABELS.get(receipt.status, receipt.status)),
            ]),
            Spacer(1, 12),
            _p("Chi tiết hàng nhập", s.section),
            Spacer(1, 5),
        ]

        rows = [
            [
                _p(str(i), s.td_center),
                _name_cell(s, d.product.product_name if d.product else f"#{d.product_id}", d.note),
                _p(d.size.size_name if d.size else "", s.td_center),
                _p(str(d.quantity), s.td_center),
                _p(money(d.import_price), s.td_right),
                _p(money(d.total_price), s.td_right),
            ]
            for i, d in enumerate(receipt.details, start=1)
        ]
        story.append(_items_table(
            s,
            [("STT", "center"), ("Tên bánh", "left"), ("Kích cỡ", "center"), ("SL", "center"), ("Đơn giá nhập", "right"), ("Thành tiền", "right")],
            rows,
            [12 * mm, CONTENT_W - 120 * mm, 30 * mm, 14 * mm, 30 * mm, 34 * mm],
        ))

        stamp_text, stamp_color = {
            "Completed": ("ĐÃ NHẬP KHO", GREEN),
            "Cancelled": ("PHIẾU ĐÃ HỦY", RED),
        }.get(receipt.status, ("CHỜ NHẬP KHO", AMBER))
        total_qty = sum(d.quantity for d in receipt.details)
        summary = Table(
            [[_stamp(s, stamp_text, stamp_color), _totals(s, [("Tổng số lượng", f"{total_qty} bánh")], ("Tổng tiền nhập", money(receipt.total_amount)))]],
            colWidths=[CONTENT_W - 90 * mm, 90 * mm],
        )
        summary.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        story += [
            Spacer(1, 10),
            KeepTogether([summary, Spacer(1, 6), _p(f"Bằng chữ: {money_in_words(receipt.total_amount)}.", s.words)]),
        ]

        if receipt.notes:
            story += [Spacer(1, 10), _note_box(s, "Ghi chú:", receipt.notes)]

        signers = ["Người lập phiếu", "Người giao hàng", "Thủ kho"]
        signatures = Table(
            [[_p(t, s.sign_title) for t in signers], [_p("(Ký, ghi rõ họ tên)", s.sign_hint)] * 3, [""] * 3],
            colWidths=[CONTENT_W / 3] * 3,
            rowHeights=[None, None, 22 * mm],
        )
        story += [Spacer(1, 22), KeepTogether([signatures])]
        return _build(story, f"Phiếu nhập {receipt.import_code}")

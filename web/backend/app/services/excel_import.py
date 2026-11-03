"""
Đọc file Excel nhập liệu hàng loạt theo mẫu do hệ thống sinh ra (phiếu nhập, cập nhật giá...).

Mỗi mẫu được mô tả bằng một TemplateSpec dùng chung cho cả hai chiều:
  - ExcelExportService.input_template(spec, rows) dựng file mẫu để người dùng tải về & điền
  - read_template(content, filename, spec) đọc lại file đã điền, trả về các dòng đã ép kiểu + lỗi theo dòng
Tầng này chỉ kiểm tra định dạng (đúng mẫu, đúng kiểu số...). Quy tắc nghiệp vụ nằm ở service của từng chức năng.
"""
import io
import re
import zipfile
from dataclasses import dataclass, field
from datetime import date, datetime, time
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException

from app.core.exceptions import BadRequestError
from app.schemas.common import ExcelRowError

META_SHEET = "_meta"
DATA_SHEET = "Nhập liệu"
GUIDE_SHEET = "Hướng dẫn"
HEADER_ROW = 5
FIRST_ROW = HEADER_ROW + 1

MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB
MAX_ROWS = 5000
MAX_ERRORS = 200

# ---------------------------------------------------------------- Ép kiểu ô Excel

def is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())

def parse_text(value: Any, max_len: int = 500) -> Optional[str]:
    if is_blank(value):
        return None
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    text = str(value).strip()
    if len(text) > max_len:
        raise ValueError(f"Tối đa {max_len} ký tự")
    return text

def parse_int(value: Any) -> Optional[int]:
    if is_blank(value):
        return None
    if isinstance(value, bool) or isinstance(value, (datetime, date, time)):
        raise ValueError("Phải là số nguyên")
    if isinstance(value, int):
        return value
    if isinstance(value, (float, Decimal)):
        if value == int(value):
            return int(value)
        raise ValueError("Phải là số nguyên, không có phần lẻ")
    text = re.sub(r"\s", "", str(value))
    # Cho phép dấu phân cách hàng nghìn: 1.000 hoặc 1,000
    if re.fullmatch(r"[+-]?\d{1,3}([.,]\d{3})+", text):
        text = re.sub(r"[.,]", "", text)
    if re.fullmatch(r"[+-]?\d+", text):
        return int(text)
    raise ValueError("Phải là số nguyên")

MONEY_LIMIT = Decimal("10") ** 13  # DECIMAL(15, 2)

def parse_money(value: Any) -> Optional[Decimal]:
    if is_blank(value):
        return None
    if isinstance(value, bool) or isinstance(value, (datetime, date, time)):
        raise ValueError("Phải là số tiền, ví dụ 150000")
    if isinstance(value, (int, float, Decimal)):
        amount = Decimal(str(value))
    else:
        text = re.sub(r"\s|đ|₫|vnđ|vnd", "", str(value).strip().lower())
        if text.startswith("-"):
            raise ValueError("Không được là số âm")
        if re.fullmatch(r"\d{1,3}(\.\d{3})+(,\d+)?", text):      # 1.250.000 hoặc 1.250.000,5
            text = text.replace(".", "").replace(",", ".")
        elif re.fullmatch(r"\d{1,3}(,\d{3})+(\.\d+)?", text):    # 1,250,000 hoặc 1,250,000.5
            text = text.replace(",", "")
        elif re.fullmatch(r"\d+,\d{1,2}", text):                 # 12,5
            text = text.replace(",", ".")
        if not re.fullmatch(r"\d+(\.\d+)?", text):
            raise ValueError("Phải là số tiền, ví dụ 150000")
        amount = Decimal(text)
    try:
        amount = amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except InvalidOperation:
        raise ValueError("Số tiền không hợp lệ")
    if amount < 0:
        raise ValueError("Không được là số âm")
    if amount >= MONEY_LIMIT:
        raise ValueError("Số tiền quá lớn")
    return amount

PARSERS: Dict[str, Callable[[Any], Any]] = {
    "text": parse_text,
    "int": parse_int,
    "money": parse_money,
}

# ---------------------------------------------------------------- Mô tả mẫu

@dataclass(frozen=True)
class Column:
    key: str
    header: str
    kind: str = "text"          # text | int | money: quyết định cách đọc, định dạng số và data validation
    width: float = 14
    input: bool = False         # Cột người dùng điền: mở khóa + tô vàng trong file mẫu
    key_column: bool = False    # Cột khóa nhận diện dòng (bị khóa nhưng vẫn được đọc lại)
    min_value: Optional[int] = None  # Ràng buộc data validation trong Excel (backend vẫn kiểm tra lại)

@dataclass(frozen=True)
class TemplateSpec:
    code: str                   # Ghi vào sheet ẩn _meta để nhận ra file đúng mẫu & đúng phiên bản
    title: str
    subtitle: str
    filename: str
    columns: Sequence[Column]
    guide: Sequence[str] = field(default_factory=tuple)

    def header(self, key: str) -> str:
        return next(c.header for c in self.columns if c.key == key)

    @property
    def input_columns(self) -> List[Column]:
        return [c for c in self.columns if c.input]

@dataclass
class ParsedRow:
    row: int                    # Số dòng trên Excel để báo lỗi cho người dùng
    values: Dict[str, Any]

# ---------------------------------------------------------------- Đọc file

def _open_workbook(content: bytes, filename: Optional[str]):
    if not (filename or "").lower().endswith(".xlsx"):
        raise BadRequestError("Chỉ hỗ trợ file Excel .xlsx (hãy dùng file mẫu tải từ hệ thống)")
    if not content:
        raise BadRequestError("File rỗng")
    if len(content) > MAX_FILE_SIZE:
        raise BadRequestError(f"File quá lớn (tối đa {MAX_FILE_SIZE // (1024 * 1024)} MB)")
    # .xlsx là file zip: chặn sớm file đổi đuôi
    if not content.startswith(b"PK"):
        raise BadRequestError("File không phải định dạng Excel .xlsx hợp lệ")
    try:
        # data_only: đọc giá trị đã tính của ô công thức thay vì chuỗi công thức
        return load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except (InvalidFileException, zipfile.BadZipFile, KeyError, OSError, ValueError):
        raise BadRequestError("Không đọc được file Excel, file có thể bị hỏng")

def _check_template(wb, spec: TemplateSpec):
    code = None
    if META_SHEET in wb.sheetnames:
        for row in wb[META_SHEET].iter_rows(min_row=1, max_row=5, max_col=2, values_only=True):
            if row and row[0] == "template":
                code = row[1]
                break
    if code != spec.code:
        raise BadRequestError(
            f"File không đúng mẫu \"{spec.title}\" hoặc là mẫu phiên bản cũ. Hãy tải file mẫu mới và điền lại."
        )

def _data_sheet(wb):
    if DATA_SHEET in wb.sheetnames:
        return wb[DATA_SHEET]
    raise BadRequestError(f"Không tìm thấy sheet \"{DATA_SHEET}\" trong file. Đừng đổi tên sheet của file mẫu.")

def _check_headers(ws, spec: TemplateSpec):
    header = next(
        ws.iter_rows(min_row=HEADER_ROW, max_row=HEADER_ROW, max_col=len(spec.columns), values_only=True),
        (),
    )
    header = list(header) + [None] * (len(spec.columns) - len(header))
    for col, actual in zip(spec.columns, header):
        if str(actual or "").strip() != col.header:
            raise BadRequestError(
                f"File không đúng mẫu: dòng {HEADER_ROW} phải có cột \"{col.header}\". Đừng thêm / xóa / đổi tên cột."
            )

def read_template(content: bytes, filename: Optional[str], spec: TemplateSpec) -> Tuple[List[ParsedRow], List[ExcelRowError]]:
    """
    Trả về (các dòng đã điền, lỗi định dạng).
    Dòng bỏ trống mọi cột nhập liệu được bỏ qua (dòng có sẵn trong mẫu nhưng người dùng không điền).
    Dòng có lỗi định dạng không nằm trong kết quả.
    """
    wb = _open_workbook(content, filename)
    try:
        _check_template(wb, spec)
        ws = _data_sheet(wb)
        _check_headers(ws, spec)

        readable = [(i, c) for i, c in enumerate(spec.columns) if c.input or c.key_column]
        rows: List[ParsedRow] = []
        errors: List[ExcelRowError] = []
        for offset, values in enumerate(
            ws.iter_rows(min_row=FIRST_ROW, max_col=len(spec.columns), values_only=True)
        ):
            row_no = FIRST_ROW + offset
            if row_no - FIRST_ROW >= MAX_ROWS:
                if any(not is_blank(v) for v in values):
                    raise BadRequestError(f"File có quá nhiều dòng (tối đa {MAX_ROWS} dòng dữ liệu)")
                continue
            values = list(values) + [None] * (len(spec.columns) - len(values))
            if all(is_blank(values[i]) for i, c in readable if c.input):
                continue

            parsed: Dict[str, Any] = {}
            ok = True
            for i, col in readable:
                try:
                    parsed[col.key] = PARSERS[col.kind](values[i])
                except ValueError as e:
                    ok = False
                    errors.append(ExcelRowError(row=row_no, column=col.header, message=str(e)))
            if ok:
                rows.append(ParsedRow(row=row_no, values=parsed))
        return rows, errors
    finally:
        wb.close()

def finalize_errors(errors: List[ExcelRowError]) -> List[ExcelRowError]:
    """Sắp xếp theo dòng và giới hạn số lỗi trả về"""
    return sorted(errors, key=lambda e: e.row)[:MAX_ERRORS]

# ---------------------------------------------------------------- Các mẫu

_KEY_COLUMNS = (
    Column("product_id", "Mã SP", "int", 9, key_column=True),
    Column("product_name", "Tên bánh", "text", 34),
    Column("category_name", "Danh mục", "text", 16),
    Column("size_id", "Mã size", "int", 9, key_column=True),
    Column("size_name", "Kích cỡ", "text", 16),
)

IMPORT_RECEIPT_TEMPLATE = TemplateSpec(
    code="import_receipt_v1",
    title="MẪU NHẬP PHIẾU NHẬP HÀNG",
    subtitle="Điền số lượng và giá nhập vào các ô nền vàng cho những bánh cần nhập. Dòng bỏ trống sẽ được bỏ qua.",
    filename="mau-phieu-nhap.xlsx",
    columns=(
        *_KEY_COLUMNS,
        Column("stock_quantity", "Tồn kho hiện tại", "int", 13),
        Column("quantity", "Số lượng nhập", "int", 14, input=True, min_value=1),
        Column("import_price", "Giá nhập (đ/cái)", "money", 17, input=True, min_value=0),
        Column("note", "Ghi chú", "text", 30, input=True),
    ),
    guide=(
        "1. Mỗi dòng là một bánh theo kích cỡ, danh sách lấy từ hệ thống lúc tải mẫu (không gồm bánh ngừng kinh doanh).",
        "2. Chỉ điền vào các ô nền vàng: Số lượng nhập (số nguyên > 0), Giá nhập (đồng / 1 cái), Ghi chú (không bắt buộc).",
        "3. Bánh nào không nhập thì để trống cả dòng. Có thể lọc / ẩn dòng nhưng không thêm, xóa hay đổi tên cột.",
        "4. Không sửa các cột Mã SP, Mã size: hệ thống dùng hai cột này để nhận ra bánh.",
        "5. Trên trang Phiếu nhập hàng, bấm \"Nhập từ Excel\" và chọn file. Dữ liệu được đưa vào form tạo phiếu để bạn",
        "   chọn nhà cung cấp, kiểm tra lại rồi mới lưu, file chưa ghi gì vào kho.",
        "6. Bánh hoặc kích cỡ mới thêm sau khi tải mẫu sẽ không có trong file: hãy tải lại mẫu mới.",
    ),
)

PRICE_TEMPLATE = TemplateSpec(
    code="product_price_v1",
    title="MẪU CẬP NHẬT GIÁ BÁN",
    subtitle="Điền giá bán mới vào ô nền vàng cho những bánh cần đổi giá. Dòng bỏ trống hoặc giữ nguyên giá sẽ được bỏ qua.",
    filename="mau-cap-nhat-gia.xlsx",
    columns=(
        *_KEY_COLUMNS,
        Column("current_price", "Giá bán hiện tại", "money", 17),
        Column("new_price", "Giá bán mới", "money", 17, input=True, min_value=0),
    ),
    guide=(
        "1. Mỗi dòng là một bánh theo kích cỡ, kèm giá bán tại thời điểm tải mẫu (không gồm bánh ngừng kinh doanh).",
        "2. Chỉ điền cột \"Giá bán mới\" (ô nền vàng) cho những bánh cần đổi giá, đơn vị đồng. Để trống = giữ nguyên giá.",
        "3. Không sửa các cột Mã SP, Mã size: hệ thống dùng hai cột này để nhận ra bánh.",
        "4. Trên trang Danh mục bánh, bấm \"Cập nhật giá từ Excel\" và chọn file. Hệ thống hiện bảng so sánh giá cũ / mới,",
        "   bạn xác nhận thì giá mới được áp dụng ngay cho khách hàng.",
        "5. Nếu giá của bánh bị người khác sửa sau khi bạn tải file lên, hệ thống sẽ từ chối để tránh ghi đè.",
    ),
)

import re
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.core.exceptions import BadRequestError, NotFoundError
from thesweets_common.models.import_receipt import Supplier, ImportReceipt, ImportReceiptDetail
from thesweets_common.models.product import ProductSize
from app.schemas.admin.import_receipt import ImportReceiptCreate, ImportExcelLineOut, ImportExcelPreviewOut
from app.schemas.common import ExcelRowError
from app.services.excel_import import IMPORT_RECEIPT_TEMPLATE, finalize_errors, read_template
from app.services.admin.product_service import AdminProductService

class AdminImportReceiptService:
    @staticmethod
    def get_suppliers(db: Session) -> List[Supplier]:
        return db.query(Supplier).order_by(Supplier.supplier_code).all()

    @staticmethod
    def get_all(db: Session, status: Optional[str] = None) -> List[ImportReceipt]:
        query = db.query(ImportReceipt)
        if status and status != "all":
            query = query.filter(ImportReceipt.status == status)
        return query.order_by(ImportReceipt.import_id.desc()).all()

    @staticmethod
    def get_by_id(db: Session, import_id: int) -> Optional[ImportReceipt]:
        return db.query(ImportReceipt).filter(ImportReceipt.import_id == import_id).first()

    @staticmethod
    def _next_code(db: Session) -> str:
        # Mã phiếu dạng PN001, PN002... lấy số lớn nhất hiện có + 1
        numbers = [
            int(m.group(1))
            for (code,) in db.query(ImportReceipt.import_code).all()
            if (m := re.fullmatch(r"PN(\d+)", code or ""))
        ]
        return f"PN{(max(numbers) + 1) if numbers else 1:03d}"

    @staticmethod
    def _add_stock(db: Session, receipt: ImportReceipt) -> None:
        for d in receipt.details:
            ps = db.query(ProductSize).filter(
                ProductSize.product_id == d.product_id,
                ProductSize.size_id == d.size_id,
            ).with_for_update().first()
            if not ps:
                raise BadRequestError(f"Sản phẩm #{d.product_id} không còn kích cỡ này để nhập kho")
            ps.stock_quantity += d.quantity

    @staticmethod
    def create(db: Session, data: ImportReceiptCreate) -> ImportReceipt:
        supplier = db.query(Supplier).filter(Supplier.supplier_id == data.supplier_id).first()
        if not supplier:
            raise NotFoundError("Không tìm thấy nhà cung cấp")
        if supplier.status != "Active":
            raise BadRequestError("Nhà cung cấp đang ngừng hợp tác")

        seen = set()
        for d in data.details:
            key = (d.product_id, d.size_id)
            if key in seen:
                raise BadRequestError("Một bánh cùng kích cỡ chỉ được nhập một dòng trong phiếu")
            seen.add(key)
            exists = db.query(ProductSize.id).filter(
                ProductSize.product_id == d.product_id,
                ProductSize.size_id == d.size_id,
            ).first()
            if not exists:
                raise BadRequestError(f"Sản phẩm #{d.product_id} không có kích cỡ đã chọn")

        receipt = ImportReceipt(
            import_code=AdminImportReceiptService._next_code(db),
            supplier_id=data.supplier_id,
            notes=data.notes.strip() if data.notes and data.notes.strip() else None,
            status=data.status,
            total_amount=sum((Decimal(d.quantity) * d.import_price for d in data.details), Decimal(0)),
        )
        if data.import_date:
            receipt.import_date = data.import_date
        receipt.details = [
            ImportReceiptDetail(
                product_id=d.product_id,
                size_id=d.size_id,
                quantity=d.quantity,
                import_price=d.import_price,
                total_price=Decimal(d.quantity) * d.import_price,
                note=d.note.strip() if d.note and d.note.strip() else None,
            )
            for d in data.details
        ]
        db.add(receipt)
        db.flush()

        if data.status == "Completed":
            AdminImportReceiptService._add_stock(db, receipt)

        db.commit()
        db.refresh(receipt)
        return receipt

    @staticmethod
    def update_status(db: Session, import_id: int, new_status: str) -> Optional[ImportReceipt]:
        receipt = db.query(ImportReceipt).filter(ImportReceipt.import_id == import_id).with_for_update().first()
        if not receipt:
            return None

        # Chỉ phiếu tạm mới đổi được trạng thái; phiếu đã nhập kho hoặc đã hủy là trạng thái cuối
        if receipt.status != "Pending":
            raise BadRequestError("Chỉ phiếu đang chờ nhập kho mới được xác nhận hoặc hủy")

        if new_status == "Completed":
            AdminImportReceiptService._add_stock(db, receipt)

        receipt.status = new_status
        db.commit()
        db.refresh(receipt)
        return receipt

    # ===================== Nhập phiếu từ file Excel theo mẫu =====================

    @staticmethod
    def excel_template_rows(db: Session) -> List[list]:
        """Các dòng điền sẵn cho file mẫu, theo thứ tự cột của IMPORT_RECEIPT_TEMPLATE"""
        return [
            [
                ps.product_id,
                ps.product.product_name,
                ps.product.category.category_name if ps.product.category else "",
                ps.size_id,
                ps.size.size_name if ps.size else "",
                ps.stock_quantity,
                None,
                None,
                None,
            ]
            for ps in AdminProductService.active_variants(db)
        ]

    @staticmethod
    def preview_excel(db: Session, content: bytes, filename: Optional[str]) -> ImportExcelPreviewOut:
        """
        Đọc file Excel đã điền và kiểm tra theo quy tắc phiếu nhập. KHÔNG ghi gì vào CSDL:
        frontend đưa các dòng hợp lệ vào form tạo phiếu, người dùng chọn nhà cung cấp rồi lưu bằng API tạo phiếu.
        """
        spec = IMPORT_RECEIPT_TEMPLATE
        rows, errors = read_template(content, filename, spec)

        pairs = {(r.values["product_id"], r.values["size_id"]) for r in rows}
        variants = {}
        if pairs:
            product_ids = {p for p, _ in pairs if p is not None}
            for ps in (
                db.query(ProductSize)
                .filter(ProductSize.product_id.in_(product_ids))
                .options(joinedload(ProductSize.product), joinedload(ProductSize.size))
                .all()
            ):
                variants[(ps.product_id, ps.size_id)] = ps

        lines: List[ImportExcelLineOut] = []
        seen = {}
        for r in rows:
            v = r.values

            def error(key: str, message: str):
                errors.append(ExcelRowError(row=r.row, column=spec.header(key), message=message))

            if v["product_id"] is None or v["size_id"] is None:
                error("product_id", "Thiếu Mã SP / Mã size. Đừng xóa hai cột này trong file mẫu")
                continue
            key = (v["product_id"], v["size_id"])
            ps = variants.get(key)
            if not ps:
                error("product_id", f"Không tìm thấy bánh #{key[0]} với kích cỡ này (có thể đã bị xóa). Hãy tải lại file mẫu")
                continue
            name = ps.product.product_name
            if ps.product.status == "Discontinued":
                error("product_name", f"\"{name}\" đã ngừng kinh doanh")
                continue
            if key in seen:
                error("product_id", f"\"{name}\" cùng kích cỡ đã có ở dòng {seen[key]}, mỗi bánh chỉ nhập một dòng")
                continue
            seen[key] = r.row

            valid = True
            if v["quantity"] is None:
                error("quantity", "Chưa nhập số lượng")
                valid = False
            elif v["quantity"] <= 0:
                error("quantity", "Số lượng phải lớn hơn 0")
                valid = False
            if v["import_price"] is None:
                error("import_price", "Chưa nhập giá nhập")
                valid = False
            if not valid:
                continue

            lines.append(ImportExcelLineOut(
                row=r.row,
                product_id=ps.product_id,
                product_name=name,
                size_id=ps.size_id,
                size_name=ps.size.size_name if ps.size else "",
                stock_quantity=ps.stock_quantity,
                quantity=v["quantity"],
                import_price=v["import_price"],
                note=v["note"],
            ))

        if not lines and not errors:
            raise BadRequestError("File chưa có dòng nào được điền số lượng và giá nhập")
        return ImportExcelPreviewOut(lines=lines, errors=finalize_errors(errors))

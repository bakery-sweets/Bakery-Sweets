import re
from decimal import Decimal
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.import_receipt import Supplier, ImportReceipt, ImportReceiptDetail
from app.models.product import ProductSize
from app.schemas.admin.import_receipt import ImportReceiptCreate

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
                raise HTTPException(status_code=400, detail=f"Sản phẩm #{d.product_id} không còn kích cỡ này để nhập kho")
            ps.stock_quantity += d.quantity

    @staticmethod
    def create(db: Session, data: ImportReceiptCreate) -> ImportReceipt:
        supplier = db.query(Supplier).filter(Supplier.supplier_id == data.supplier_id).first()
        if not supplier:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhà cung cấp")
        if supplier.status != "Active":
            raise HTTPException(status_code=400, detail="Nhà cung cấp đang ngừng hợp tác")

        seen = set()
        for d in data.details:
            key = (d.product_id, d.size_id)
            if key in seen:
                raise HTTPException(status_code=400, detail="Một bánh cùng kích cỡ chỉ được nhập một dòng trong phiếu")
            seen.add(key)
            exists = db.query(ProductSize.id).filter(
                ProductSize.product_id == d.product_id,
                ProductSize.size_id == d.size_id,
            ).first()
            if not exists:
                raise HTTPException(status_code=400, detail=f"Sản phẩm #{d.product_id} không có kích cỡ đã chọn")

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
            raise HTTPException(status_code=400, detail="Chỉ phiếu đang chờ nhập kho mới được xác nhận hoặc hủy")

        if new_status == "Completed":
            AdminImportReceiptService._add_stock(db, receipt)

        receipt.status = new_status
        db.commit()
        db.refresh(receipt)
        return receipt

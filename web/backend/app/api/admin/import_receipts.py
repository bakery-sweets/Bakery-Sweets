from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.api.files import file_response, PDF
from thesweets_common.models.user import User
from app.services.admin.import_receipt_service import AdminImportReceiptService
from app.services.export.pdf_service import PdfExportService
from app.schemas.admin.import_receipt import (
    SupplierOut,
    ImportReceiptCreate,
    ImportReceiptStatusUpdate,
    ImportReceiptOut,
    ImportDetailOut,
)
from app.schemas.common import ResponseBase
from app.services.realtime_service import RealtimeService

router = APIRouter()

def _to_receipt_out(r) -> ImportReceiptOut:
    return ImportReceiptOut(
        import_id=r.import_id,
        import_code=r.import_code,
        supplier_id=r.supplier_id,
        supplier_code=r.supplier.supplier_code if r.supplier else "",
        supplier_name=r.supplier.supplier_name if r.supplier else "",
        total_amount=r.total_amount,
        total_quantity=sum(d.quantity for d in r.details),
        import_date=r.import_date,
        status=r.status,
        notes=r.notes,
        created_at=r.created_at,
        details=[
            ImportDetailOut(
                product_id=d.product_id,
                product_name=d.product.product_name if d.product else "",
                size_id=d.size_id,
                size_name=d.size.size_name if d.size else "",
                quantity=d.quantity,
                import_price=d.import_price,
                total_price=d.total_price,
                note=d.note,
            )
            for d in r.details
        ],
    )

@router.get("/suppliers", response_model=ResponseBase[List[SupplierOut]], summary="Lấy danh sách nhà cung cấp")
def list_suppliers(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    suppliers = AdminImportReceiptService.get_suppliers(db)
    return ResponseBase(data=[SupplierOut.model_validate(s, from_attributes=True) for s in suppliers])

@router.get("", response_model=ResponseBase[List[ImportReceiptOut]], summary="Lấy danh sách phiếu nhập")
def list_receipts(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    receipts = AdminImportReceiptService.get_all(db, status=status)
    return ResponseBase(data=[_to_receipt_out(r) for r in receipts])

@router.get("/{import_id}", response_model=ResponseBase[ImportReceiptOut], summary="Xem chi tiết phiếu nhập")
def get_receipt(
    import_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    receipt = AdminImportReceiptService.get_by_id(db, import_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu nhập")
    return ResponseBase(data=_to_receipt_out(receipt))

@router.get("/{import_id}/pdf", summary="Xuất phiếu nhập kho (PDF)")
def export_receipt_pdf(
    import_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    receipt = AdminImportReceiptService.get_by_id(db, import_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu nhập")
    return file_response(PdfExportService.import_receipt(receipt), f"phieu-nhap-{receipt.import_code}.pdf", PDF)

@router.post("", response_model=ResponseBase[ImportReceiptOut], status_code=status.HTTP_201_CREATED, summary="Tạo phiếu nhập hàng")
def create_receipt(
    data: ImportReceiptCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    receipt = AdminImportReceiptService.create(db, data)
    if receipt.status == "Completed":
        RealtimeService.stock_changed(db, [(d.product_id, d.size_id) for d in receipt.details])
    message = "Đã tạo phiếu và nhập kho thành công" if receipt.status == "Completed" else "Đã lưu phiếu nhập tạm"
    return ResponseBase(message=message, data=_to_receipt_out(receipt))

@router.patch("/{import_id}/status", response_model=ResponseBase[ImportReceiptOut], summary="Xác nhận nhập kho hoặc hủy phiếu")
def update_receipt_status(
    import_id: int,
    data: ImportReceiptStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    receipt = AdminImportReceiptService.update_status(db, import_id, data.status)
    if not receipt:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu nhập")
    if data.status == "Completed":
        RealtimeService.stock_changed(db, [(d.product_id, d.size_id) for d in receipt.details])
    message = "Đã nhập kho, tồn kho bánh đã được cộng thêm" if data.status == "Completed" else "Đã hủy phiếu nhập"
    return ResponseBase(message=message, data=_to_receipt_out(receipt))

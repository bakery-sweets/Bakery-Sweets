import re
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_staff
from app.api.files import file_response, PDF
from thesweets_common.models.user import User
from app.services.admin.order_service import AdminOrderService, ALLOWED_TRANSITIONS
from app.services.export.pdf_service import PdfExportService
from app.services.client.product_service import ClientProductService
from app.services.client.promotion_service import to_apply_response, SINGLE_USE_DEFAULT_NAME
from thesweets_common.pricing import PriceBook
from app.schemas.admin.order import (
    AdminOrderOut,
    AdminOrderDetailOut,
    AdminOrderStatusLogOut,
    AdminOrderStatusUpdate,
    AdminOrderPaymentConfirm,
    AdminOrderCreate,
    AdminCustomerLookupOut,
    AdminVoucherCheckIn,
    AdminVoucherCheckOut,
    PHONE_PATTERN,
)
from app.schemas.admin.product import AdminProductOut, ProductSizeOut
from app.schemas.common import ResponseBase

router = APIRouter()

def _to_order_out(o) -> AdminOrderOut:
    details_out = [
        AdminOrderDetailOut(
            product_id=d.product_id,
            product_name=d.product.product_name if d.product else "",
            size_id=d.size_id,
            size_name=d.size.size_name if d.size else "",
            quantity=d.quantity,
            price=d.price,
            original_price=d.original_price,
            total_price=d.price * d.quantity,
            note=d.note,
        )
        for d in o.details
    ]
    logs_out = [
        AdminOrderStatusLogOut(
            log_id=log.log_id,
            old_status=log.old_status,
            new_status=log.new_status,
            changed_by=log.changed_by,
            note=log.note,
            changed_at=log.changed_at,
        )
        for log in sorted(o.status_logs, key=lambda log: log.log_id)
    ]
    promo = o.promotion
    if not promo and o.applied_promotions:
        promo = o.applied_promotions[0].promotion if o.applied_promotions[0] else None
    voucher = o.single_use_voucher
    customer = o.customer

    return AdminOrderOut(
        order_id=o.order_id,
        order_code=o.order_code,
        customer_id=o.customer_id,
        customer_name=f"{customer.first_name} {customer.last_name}".strip() if customer else None,
        customer_phone=customer.phone if customer else None,
        recipient_name=o.recipient_name,
        recipient_phone=o.recipient_phone,
        pickup_time=o.pickup_time,
        notes=o.notes,
        promotion_id=o.promotion_id,
        promotion_code=promo.promotion_code if promo else (voucher.code if voucher else None),
        promotion_name=promo.promotion_name if promo else (
            (voucher.batch_name or SINGLE_USE_DEFAULT_NAME) if voucher else None
        ),
        voucher_code=voucher.code if voucher else None,
        total_quantity=o.total_quantity,
        total_cost=o.total_cost,
        discount_amount=o.discount_amount or Decimal("0"),
        final_cost=o.final_cost,
        status=o.status,
        payment_method=o.payment_method,
        payment_status=o.payment_status,
        order_date=o.order_date,
        details=details_out,
        status_logs=logs_out,
        next_statuses=list(ALLOWED_TRANSITIONS.get(o.status, ())),
    )

@router.get("", response_model=ResponseBase[List[AdminOrderOut]], summary="Lấy danh sách đơn hàng")
def list_orders(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff),
):
    orders = AdminOrderService.get_all(db, status=status)
    return ResponseBase(data=[_to_order_out(o) for o in orders])

# ===== Tạo đơn tại quầy (POS) — các route tĩnh phải khai báo trước "/{order_id}" =====

def _pos_size_out(s, q) -> ProductSizeOut:
    return ProductSizeOut(
        id=s.id,
        size_id=s.size_id,
        size_name=s.size.size_name if s.size else None,
        price=q.price,
        original_price=q.original_price,
        discount_percentage=q.discount_percentage,
        stock_quantity=s.stock_quantity,
    )

@router.get("/catalog", response_model=ResponseBase[List[AdminProductOut]], summary="Danh sách bánh đang bán để tạo đơn tại quầy")
def pos_catalog(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff),
):
    # Nhân viên không có quyền vào /admin/products nên dùng danh mục riêng: chỉ bánh đang bán, kèm tồn kho thật
    products = ClientProductService.get_products(db, search=search)
    # Giá trên màn hình bán hàng là giá bán thực tế (đã trừ ưu đãi sản phẩm), khớp với lúc tạo đơn
    book = PriceBook(db, [p.product_id for p in products])
    return ResponseBase(data=[
        AdminProductOut(
            product_id=p.product_id,
            product_name=p.product_name,
            category_id=p.category_id,
            category_name=p.category.category_name if p.category else None,
            status=p.status,
            image=p.image,
            sizes=[_pos_size_out(s, book.quote_size(s)) for s in sorted(p.sizes, key=lambda s: s.price)],
        )
        for p in products
    ])

@router.get("/customer-lookup", response_model=ResponseBase[AdminCustomerLookupOut], summary="Tra cứu khách hàng theo số điện thoại")
def customer_lookup(
    phone: str = Query(..., description="Số điện thoại khách"),
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff),
):
    phone = re.sub(r"\s+", "", phone)
    if not PHONE_PATTERN.match(phone):
        raise HTTPException(status_code=400, detail="Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0")
    return ResponseBase(data=AdminCustomerLookupOut(**AdminOrderService.lookup_customer(db, phone)))

@router.post("/voucher-check", response_model=ResponseBase[AdminVoucherCheckOut], summary="Tính thử mức giảm của voucher cho đơn tại quầy")
def voucher_check(
    data: AdminVoucherCheckIn,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff),
):
    phone = re.sub(r"\s+", "", data.recipient_phone or "")
    applied = AdminOrderService.check_voucher(
        db, data.voucher_code, data.order_amount, phone if PHONE_PATTERN.match(phone) else None
    )
    r = to_apply_response(applied, data.order_amount)
    return ResponseBase(
        message="Áp dụng mã khuyến mãi thành công",
        data=AdminVoucherCheckOut(
            kind=r.kind,
            promotion_id=r.promotion_id,
            promotion_code=r.promotion_code,
            promotion_name=r.promotion_name,
            description=r.description,
            discount_amount=r.discount_amount,
            final_amount=r.final_amount,
        ),
    )

@router.post("", response_model=ResponseBase[AdminOrderOut], status_code=http_status.HTTP_201_CREATED, summary="Nhân viên tạo đơn: khách gọi điện đặt bánh hoặc bán tại quầy")
def create_order(
    data: AdminOrderCreate,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff),
):
    order = AdminOrderService.create_order(db, data, staff)
    return ResponseBase(message=f"Đã tạo đơn hàng #{order.order_code}", data=_to_order_out(order))

@router.get("/{order_id}", response_model=ResponseBase[AdminOrderOut], summary="Xem chi tiết đơn hàng")
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff),
):
    order = AdminOrderService.get_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return ResponseBase(data=_to_order_out(order))

@router.patch("/{order_id}/status", response_model=ResponseBase[AdminOrderOut], summary="Cập nhật trạng thái đơn hàng")
def update_order_status(
    order_id: int,
    data: AdminOrderStatusUpdate,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff),
):
    order = AdminOrderService.update_status(db, order_id, data.status, staff.phone, data.note)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return ResponseBase(message="Cập nhật trạng thái đơn hàng thành công", data=_to_order_out(order))

@router.patch("/{order_id}/payment", response_model=ResponseBase[AdminOrderOut], summary="Xác nhận đơn hàng đã thanh toán")
def confirm_order_payment(
    order_id: int,
    data: Optional[AdminOrderPaymentConfirm] = None,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff),
):
    order = AdminOrderService.confirm_payment(db, order_id, staff.phone, data.note if data else None)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return ResponseBase(message="Xác nhận thanh toán thành công", data=_to_order_out(order))

@router.get("/{order_id}/invoice", summary="Xuất hóa đơn bán hàng (PDF)")
def export_order_invoice(
    order_id: int,
    db: Session = Depends(get_db),
    staff: User = Depends(get_current_staff),
):
    order = AdminOrderService.get_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return file_response(PdfExportService.order_invoice(order), f"hoa-don-{order.order_code}.pdf", PDF)

from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_customer, get_optional_current_user
from app.api.files import file_response, PDF
from thesweets_common.models.user import User
from app.services.client.order_service import ClientOrderService
from app.services.export.pdf_service import PdfExportService
from app.schemas.client.order import (
    CheckoutRequest,
    GuestCheckoutRequest,
    ClientOrderOut,
    ClientOrderDetailOut,
    CancelOrderRequest,
)
from app.schemas.common import ResponseBase
from app.core.security import create_guest_invoice_token, verify_guest_invoice_token
from thesweets_common.models.order import Order

router = APIRouter()

def _to_client_order_out(o) -> ClientOrderOut:
    details_out = [
        ClientOrderDetailOut(
            product_id=d.product_id,
            product_name=d.product.product_name if d.product else "",
            image=d.product.image if d.product else None,
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
    voucher = getattr(o, "single_use_voucher", None)
    promotion_code = o.promotion.promotion_code if getattr(o, "promotion", None) else None
    return ClientOrderOut(
        order_id=o.order_id,
        order_code=o.order_code,
        recipient_name=o.recipient_name,
        recipient_phone=o.recipient_phone,
        pickup_time=o.pickup_time,
        notes=o.notes,
        promotion_id=o.promotion_id,
        promotion_code=promotion_code or (voucher.code if voucher else None),
        voucher_code=voucher.code if voucher else None,
        total_quantity=o.total_quantity,
        total_cost=o.total_cost,
        discount_amount=o.discount_amount or Decimal("0"),
        final_cost=o.final_cost,
        payment_method=o.payment_method,
        payment_status=o.payment_status,
        status=o.status,
        order_date=o.order_date,
        details=details_out,
    )

@router.post("", response_model=ResponseBase[ClientOrderOut], status_code=status.HTTP_201_CREATED, summary="Đặt hàng mới (Checkout)")
def create_order(
    data: CheckoutRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
):
    if not user.customer:
        raise HTTPException(status_code=400, detail="Tài khoản chưa có hồ sơ khách hàng")
    order = ClientOrderService.create_order(db, user.customer.customer_id, data)
    return ResponseBase(message="Đặt hàng thành công", data=_to_client_order_out(order))

@router.post("/guest", response_model=ResponseBase[ClientOrderOut], status_code=status.HTTP_201_CREATED, summary="Đặt hàng không cần đăng nhập")
def create_guest_order(
    data: GuestCheckoutRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user),
):
    if user:
        # Đã đăng nhập thì đặt bằng tài khoản (dùng POST /client/orders)
        raise HTTPException(status_code=400, detail="Bạn đã đăng nhập, vui lòng tải lại trang để đặt hàng bằng tài khoản")
    order = ClientOrderService.create_guest_order(db, data)
    out = _to_client_order_out(order)
    # Khách không có token đăng nhập: cấp token chỉ dùng để tải hóa đơn của đúng đơn này
    out.invoice_token = create_guest_invoice_token(order.order_id)
    return ResponseBase(message="Đặt hàng thành công", data=out)

@router.get("/guest/{order_id}/invoice", summary="Tải hóa đơn PDF của đơn đặt không đăng nhập")
def download_guest_invoice(
    order_id: int,
    token: str = Query(..., description="invoice_token trả về lúc đặt hàng"),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.order_id == order_id).first() if verify_guest_invoice_token(token, order_id) else None
    if not order:
        raise HTTPException(status_code=404, detail="Liên kết tải hóa đơn không hợp lệ hoặc đã hết hạn")
    return file_response(PdfExportService.order_invoice(order), f"hoa-don-{order.order_code}.pdf", PDF)

@router.get("", response_model=ResponseBase[List[ClientOrderOut]], summary="Lịch sử đơn hàng của tôi")
def get_my_orders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
):
    if not user.customer:
        raise HTTPException(status_code=400, detail="Tài khoản chưa có hồ sơ khách hàng")
    orders = ClientOrderService.get_my_orders(db, user.customer.customer_id)
    return ResponseBase(data=[_to_client_order_out(o) for o in orders])

@router.get("/{order_id}", response_model=ResponseBase[ClientOrderOut], summary="Chi tiết đơn hàng")
def get_order_by_id(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
):
    if not user.customer:
        raise HTTPException(status_code=400, detail="Tài khoản chưa có hồ sơ khách hàng")
    order = ClientOrderService.get_order_by_id(db, user.customer.customer_id, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng này")
    return ResponseBase(data=_to_client_order_out(order))

@router.get("/{order_id}/invoice", summary="Tải hóa đơn PDF của đơn hàng")
def download_my_invoice(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
):
    if not user.customer:
        raise HTTPException(status_code=400, detail="Tài khoản chưa có hồ sơ khách hàng")
    order = ClientOrderService.get_order_by_id(db, user.customer.customer_id, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng này")
    return file_response(PdfExportService.order_invoice(order), f"hoa-don-{order.order_code}.pdf", PDF)

@router.put("/{order_id}/cancel", response_model=ResponseBase[ClientOrderOut], summary="Hủy đơn hàng đang chờ xử lý")
def cancel_my_order(
    order_id: int,
    data: Optional[CancelOrderRequest] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
):
    if not user.customer:
        raise HTTPException(status_code=400, detail="Tài khoản chưa có hồ sơ khách hàng")
    note = data.note if data else None
    order = ClientOrderService.cancel_order(db, user.customer.customer_id, order_id, note)
    return ResponseBase(message="Hủy đơn hàng thành công", data=_to_client_order_out(order))

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_customer
from app.models.user import User
from app.services.client.order_service import ClientOrderService
from app.schemas.client.order import CheckoutRequest, ClientOrderOut, ClientOrderDetailOut
from app.schemas.common import ResponseBase

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
            total_price=d.price * d.quantity,
            note=d.note,
        )
        for d in o.details
    ]
    return ClientOrderOut(
        order_id=o.order_id,
        order_code=o.order_code,
        recipient_name=o.recipient_name,
        recipient_phone=o.recipient_phone,
        pickup_time=o.pickup_time,
        notes=o.notes,
        total_quantity=o.total_quantity,
        total_cost=o.total_cost,
        discount_amount=o.discount_amount or 0,
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

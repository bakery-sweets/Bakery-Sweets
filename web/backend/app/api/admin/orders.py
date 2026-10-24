from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_staff
from app.models.user import User
from app.services.admin.order_service import AdminOrderService, ALLOWED_TRANSITIONS
from app.schemas.admin.order import (
    AdminOrderOut,
    AdminOrderDetailOut,
    AdminOrderStatusLogOut,
    AdminOrderStatusUpdate,
    AdminOrderPaymentConfirm,
)
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

    return AdminOrderOut(
        order_id=o.order_id,
        order_code=o.order_code,
        customer_id=o.customer_id,
        recipient_name=o.recipient_name,
        recipient_phone=o.recipient_phone,
        pickup_time=o.pickup_time,
        notes=o.notes,
        promotion_id=o.promotion_id,
        promotion_code=promo.promotion_code if promo else None,
        promotion_name=promo.promotion_name if promo else None,
        total_quantity=o.total_quantity,
        total_cost=o.total_cost,
        discount_amount=o.discount_amount or 0,
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

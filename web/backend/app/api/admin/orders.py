from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.models.user import User
from app.services.admin.order_service import AdminOrderService
from app.schemas.admin.order import AdminOrderOut, AdminOrderDetailOut, AdminOrderStatusUpdate
from app.schemas.common import ResponseBase

router = APIRouter()

def _to_order_out(o) -> AdminOrderOut:
    details_out = [
        AdminOrderDetailOut(
            product_id=d.product_id,
            product_name=d.product.product_name if d.product else "",
            size_name=d.size.size_name if d.size else "",
            quantity=d.quantity,
            unit_price=d.unit_price,
            total_price=d.total_price,
        )
        for d in o.details
    ]
    return AdminOrderOut(
        order_id=o.order_id,
        order_code=o.order_code,
        recipient_name=o.recipient_name,
        recipient_phone=o.recipient_phone,
        shipping_address=o.shipping_address,
        total_cost=o.total_cost,
        final_cost=o.final_cost,
        status=o.status,
        payment_method=o.payment_method,
        payment_status=o.payment_status,
        order_date=o.order_date,
        details=details_out,
    )

@router.get("", response_model=ResponseBase[List[AdminOrderOut]], summary="Lấy danh sách đơn hàng")
def list_orders(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    orders = AdminOrderService.get_all(db, status=status)
    return ResponseBase(data=[_to_order_out(o) for o in orders])

@router.get("/{order_id}", response_model=ResponseBase[AdminOrderOut], summary="Xem chi tiết đơn hàng")
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
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
    admin: User = Depends(get_current_admin),
):
    order = AdminOrderService.update_status(db, order_id, data.status, admin.user_name, data.note)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return ResponseBase(message="Cập nhật trạng thái đơn hàng thành công", data=_to_order_out(order))

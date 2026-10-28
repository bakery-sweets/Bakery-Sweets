from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user, get_current_customer, require_staff
from thesweets_common.models.user import User
from app.schemas.order import OrderCreate, OrderOut
from app.services.order_service import OrderService

router = APIRouter()

@router.post("/orders", response_model=OrderOut)
def create_order(
    req: OrderCreate,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    return OrderService.create_order(db, current_user, req)

@router.get("/orders", response_model=List[OrderOut])
def get_my_orders(
    status: str = "All",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return OrderService.get_orders(db, current_user, status)

@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order_detail(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return OrderService.get_order_detail(db, current_user, order_id)

@router.put("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    new_status: str,
    note: str = "",
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    OrderService.update_status(db, current_user, order_id, new_status, note)
    return {"message": "Cập nhật trạng thái thành công", "new_status": new_status}

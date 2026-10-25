from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_customer
from app.models.user import User
from app.schemas.order import CartItemAdd, CartItemUpdate, CartItemOut
from app.services.cart_service import CartService
from app.services.realtime_service import RealtimeService

router = APIRouter()

def _notify_cart_changed(user: User):
    # Báo các thiết bị khác của cùng tài khoản (Web / App khác) tải lại giỏ hàng
    RealtimeService.to_user(user.phone, "cart_updated")

@router.get("/cart", response_model=List[CartItemOut])
def get_cart(
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    return CartService.get_cart(db, current_user.customer.customer_id)

@router.post("/cart", response_model=CartItemOut)
def add_to_cart(
    req: CartItemAdd,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    item = CartService.add_item(db, current_user.customer.customer_id, req)
    _notify_cart_changed(current_user)
    return item

@router.put("/cart/{cart_id}", response_model=CartItemOut)
def update_cart_item(
    cart_id: int,
    req: CartItemUpdate,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    item = CartService.update_item(db, current_user.customer.customer_id, cart_id, req.quantity)
    _notify_cart_changed(current_user)
    if item is None:
        raise HTTPException(status_code=200, detail="Đã xóa sản phẩm khỏi giỏ hàng")
    return item

@router.delete("/cart/{cart_id}")
def delete_cart_item(
    cart_id: int,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    CartService.remove_item(db, current_user.customer.customer_id, cart_id)
    _notify_cart_changed(current_user)
    return {"message": "Đã xóa sản phẩm khỏi giỏ hàng thành công"}

@router.delete("/cart")
def clear_cart(
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    CartService.clear(db, current_user.customer.customer_id)
    _notify_cart_changed(current_user)
    return {"message": "Đã làm trống giỏ hàng thành công"}

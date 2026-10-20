from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_customer
from app.models.user import User
from app.models.order import Cart
from app.services.client.cart_service import ClientCartService
from app.schemas.client.cart import CartItemAdd, CartItemUpdate, CartSummaryOut
from app.schemas.common import ResponseBase

router = APIRouter()

@router.get("", response_model=ResponseBase[CartSummaryOut], summary="Lấy danh sách món trong giỏ hàng")
def get_cart(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
):
    if not user.customer:
        raise HTTPException(status_code=400, detail="Tài khoản chưa có hồ sơ khách hàng")
    summary = ClientCartService.get_cart_summary(db, user.customer.customer_id)
    return ResponseBase(data=summary)

@router.post("/items", response_model=ResponseBase, status_code=status.HTTP_201_CREATED, summary="Thêm món bánh vào giỏ")
def add_to_cart(
    data: CartItemAdd,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
):
    if not user.customer:
        raise HTTPException(status_code=400, detail="Tài khoản chưa có hồ sơ khách hàng")
    ClientCartService.add_item(db, user.customer.customer_id, data)
    return ResponseBase(message="Đã thêm vào giỏ hàng")

@router.put("/items/{cart_id}", response_model=ResponseBase, summary="Cập nhật số lượng món trong giỏ")
def update_cart_item(
    cart_id: int,
    data: CartItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
):
    item = db.query(Cart).filter(Cart.cart_id == cart_id, Cart.customer_id == user.customer.customer_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Món hàng không tồn tại trong giỏ")
    ClientCartService.update_quantity(db, user.customer.customer_id, cart_id, data.quantity)
    return ResponseBase(message="Cập nhật giỏ hàng thành công")

@router.delete("/items/{cart_id}", response_model=ResponseBase, summary="Xóa một món khỏi giỏ hàng")
def remove_cart_item(
    cart_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
):
    if not user.customer:
        raise HTTPException(status_code=400, detail="Tài khoản chưa có hồ sơ khách hàng")
    success = ClientCartService.remove_item(db, user.customer.customer_id, cart_id)
    if not success:
        raise HTTPException(status_code=404, detail="Món hàng không tồn tại trong giỏ")
    return ResponseBase(message="Đã xóa khỏi giỏ hàng")

@router.delete("", response_model=ResponseBase, summary="Xóa toàn bộ giỏ hàng")
def clear_cart(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
):
    if not user.customer:
        raise HTTPException(status_code=400, detail="Tài khoản chưa có hồ sơ khách hàng")
    ClientCartService.clear_cart(db, user.customer.customer_id)
    return ResponseBase(message="Đã dọn sạch giỏ hàng")

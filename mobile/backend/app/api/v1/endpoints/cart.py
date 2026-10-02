from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.config.database import get_db
from app.models.user import User
from app.models.order import Cart
from app.models.product import ProductSize
from app.schemas.order import CartItemAdd, CartItemUpdate, CartItemOut
from app.core.security import get_current_user

router = APIRouter()

def _get_customer_id(user: User) -> int:
    if not user.customer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản này chưa có hồ sơ khách hàng để mua hàng",
        )
    return user.customer.customer_id

@router.get("/cart", response_model=List[CartItemOut])
def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer_id = _get_customer_id(current_user)
    items = db.query(Cart).options(
        joinedload(Cart.product),
        joinedload(Cart.size)
    ).filter(Cart.customer_id == customer_id).all()

    result = []
    for item in items:
        ps = db.query(ProductSize).filter(
            ProductSize.product_id == item.product_id,
            ProductSize.size_id == item.size_id
        ).first()
        price = ps.price if ps else 0
        subtotal = price * item.quantity

        result.append(CartItemOut(
            cart_id=item.cart_id,
            product_id=item.product_id,
            product_name=item.product.product_name if item.product else "",
            image=item.product.image if item.product else None,
            size_id=item.size_id,
            size_name=item.size.size_name if item.size else "",
            price=price,
            quantity=item.quantity,
            subtotal=subtotal,
        ))

    return result

@router.post("/cart", response_model=CartItemOut)
def add_to_cart(
    req: CartItemAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer_id = _get_customer_id(current_user)

    ps = db.query(ProductSize).options(
        joinedload(ProductSize.product),
        joinedload(ProductSize.size)
    ).filter(
        ProductSize.product_id == req.product_id,
        ProductSize.size_id == req.size_id
    ).first()

    if not ps:
        raise HTTPException(status_code=404, detail="Sản phẩm hoặc kích cỡ không hợp lệ")

    if ps.stock_quantity < req.quantity:
        raise HTTPException(status_code=400, detail="Số lượng trong kho không đủ")

    cart_item = db.query(Cart).filter(
        Cart.customer_id == customer_id,
        Cart.product_id == req.product_id,
        Cart.size_id == req.size_id
    ).first()

    if cart_item:
        cart_item.quantity += req.quantity
    else:
        cart_item = Cart(
            customer_id=customer_id,
            product_id=req.product_id,
            size_id=req.size_id,
            quantity=req.quantity,
        )
        db.add(cart_item)

    db.commit()
    db.refresh(cart_item)

    return CartItemOut(
        cart_id=cart_item.cart_id,
        product_id=ps.product_id,
        product_name=ps.product.product_name if ps.product else "",
        image=ps.product.image if ps.product else None,
        size_id=ps.size_id,
        size_name=ps.size.size_name if ps.size else "",
        price=ps.price,
        quantity=cart_item.quantity,
        subtotal=ps.price * cart_item.quantity,
    )

@router.put("/cart/{cart_id}", response_model=CartItemOut)
def update_cart_item(
    cart_id: int,
    req: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer_id = _get_customer_id(current_user)
    cart_item = db.query(Cart).filter(
        Cart.cart_id == cart_id,
        Cart.customer_id == customer_id
    ).first()

    if not cart_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục trong giỏ hàng")

    if req.quantity <= 0:
        db.delete(cart_item)
        db.commit()
        raise HTTPException(status_code=200, detail="Đã xóa sản phẩm khỏi giỏ hàng")

    cart_item.quantity = req.quantity
    db.commit()
    db.refresh(cart_item)

    ps = db.query(ProductSize).options(
        joinedload(ProductSize.product),
        joinedload(ProductSize.size)
    ).filter(
        ProductSize.product_id == cart_item.product_id,
        ProductSize.size_id == cart_item.size_id
    ).first()

    price = ps.price if ps else 0
    return CartItemOut(
        cart_id=cart_item.cart_id,
        product_id=cart_item.product_id,
        product_name=ps.product.product_name if ps and ps.product else "",
        image=ps.product.image if ps and ps.product else None,
        size_id=cart_item.size_id,
        size_name=ps.size.size_name if ps and ps.size else "",
        price=price,
        quantity=cart_item.quantity,
        subtotal=price * cart_item.quantity,
    )

@router.delete("/cart/{cart_id}")
def delete_cart_item(
    cart_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer_id = _get_customer_id(current_user)
    cart_item = db.query(Cart).filter(
        Cart.cart_id == cart_id,
        Cart.customer_id == customer_id
    ).first()

    if not cart_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục trong giỏ hàng")

    db.delete(cart_item)
    db.commit()
    return {"message": "Đã xóa sản phẩm khỏi giỏ hàng thành công"}

@router.delete("/cart")
def clear_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer_id = _get_customer_id(current_user)
    db.query(Cart).filter(Cart.customer_id == customer_id).delete()
    db.commit()
    return {"message": "Đã làm trống giỏ hàng thành công"}

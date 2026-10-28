from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from thesweets_common.models.order import Cart
from thesweets_common.models.product import ProductSize
from app.schemas.order import CartItemAdd, CartItemOut
from app.services.product_service import ProductService

class CartService:
    @staticmethod
    def _to_cart_item_out(cart_item: Cart, ps: Optional[ProductSize]) -> CartItemOut:
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
            stock_quantity=ps.stock_quantity if ps else 0,
        )

    @staticmethod
    def _get_owned_item(db: Session, customer_id: int, cart_id: int) -> Cart:
        cart_item = db.query(Cart).filter(
            Cart.cart_id == cart_id,
            Cart.customer_id == customer_id
        ).first()

        if not cart_item:
            raise NotFoundError("Không tìm thấy mục trong giỏ hàng")
        return cart_item

    @staticmethod
    def get_cart(db: Session, customer_id: int) -> List[CartItemOut]:
        items = db.query(Cart).filter(Cart.customer_id == customer_id).all()
        return [
            CartService._to_cart_item_out(item, ProductService.get_size(db, item.product_id, item.size_id))
            for item in items
        ]

    @staticmethod
    def add_item(db: Session, customer_id: int, req: CartItemAdd) -> CartItemOut:
        cart_item = db.query(Cart).filter(
            Cart.customer_id == customer_id,
            Cart.product_id == req.product_id,
            Cart.size_id == req.size_id
        ).first()

        # Tồn kho phải đủ cho tổng số lượng trong giỏ (kể cả phần đã thêm từ Web trước đó)
        new_total_qty = (cart_item.quantity if cart_item else 0) + req.quantity
        ps = ProductService.get_sellable_size(db, req.product_id, req.size_id, new_total_qty)

        if cart_item:
            cart_item.quantity = new_total_qty
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
        return CartService._to_cart_item_out(cart_item, ps)

    @staticmethod
    def update_item(db: Session, customer_id: int, cart_id: int, quantity: int) -> Optional[CartItemOut]:
        """Cập nhật số lượng; trả về None nếu quantity <= 0 (mục đã bị xóa khỏi giỏ)"""
        cart_item = CartService._get_owned_item(db, customer_id, cart_id)

        if quantity <= 0:
            db.delete(cart_item)
            db.commit()
            return None

        ps = ProductService.get_size(db, cart_item.product_id, cart_item.size_id)
        # Chỉ chặn khi tăng số lượng, giảm thì luôn cho phép
        if ps and quantity > cart_item.quantity and ps.stock_quantity < quantity:
            raise ProductService.out_of_stock_error(ps)

        cart_item.quantity = quantity
        db.commit()
        db.refresh(cart_item)
        return CartService._to_cart_item_out(cart_item, ps)

    @staticmethod
    def remove_item(db: Session, customer_id: int, cart_id: int) -> None:
        cart_item = CartService._get_owned_item(db, customer_id, cart_id)
        db.delete(cart_item)
        db.commit()

    @staticmethod
    def clear(db: Session, customer_id: int) -> None:
        db.query(Cart).filter(Cart.customer_id == customer_id).delete()
        db.commit()

from typing import List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.exceptions import BadRequestError, NotFoundError
from thesweets_common.models.order import Cart
from thesweets_common.models.product import ProductSize, Product, Size
from app.schemas.client.cart import CartItemAdd, CartItemOut, CartSummaryOut

class ClientCartService:
    @staticmethod
    def get_cart_summary(db: Session, customer_id: int) -> CartSummaryOut:
        cart_items = db.query(Cart).filter(Cart.customer_id == customer_id).all()
        items_out: List[CartItemOut] = []
        total_amount = Decimal("0.00")
        total_items = 0

        for ci in cart_items:
            ps = db.query(ProductSize).filter(
                ProductSize.product_id == ci.product_id,
                ProductSize.size_id == ci.size_id
            ).first()

            price = ps.price if ps else Decimal("0.00")
            item_total = price * ci.quantity
            total_amount += item_total
            total_items += ci.quantity

            items_out.append(CartItemOut(
                cart_id=ci.cart_id,
                product_id=ci.product_id,
                product_name=ci.product.product_name if ci.product else "",
                image=ci.product.image if ci.product else None,
                size_id=ci.size_id,
                size_name=ci.size.size_name if ci.size else "",
                unit_price=price,
                quantity=ci.quantity,
                item_total=item_total,
                stock_quantity=ps.stock_quantity if ps else 0,
            ))

        return CartSummaryOut(
            items=items_out,
            total_items=total_items,
            total_amount=total_amount,
        )

    @staticmethod
    def add_item(db: Session, customer_id: int, data: CartItemAdd) -> Cart:
        # Kiểm tra sản phẩm và biến thể kích cỡ
        ps = db.query(ProductSize).filter(
            ProductSize.product_id == data.product_id,
            ProductSize.size_id == data.size_id
        ).first()

        if not ps:
            raise NotFoundError("Sản phẩm hoặc kích cỡ không tồn tại")

        if ps.product and ps.product.status != "Available":
            raise BadRequestError("Sản phẩm này hiện không còn khả dụng")

        existing = db.query(Cart).filter(
            Cart.customer_id == customer_id,
            Cart.product_id == data.product_id,
            Cart.size_id == data.size_id,
        ).first()

        new_total_qty = (existing.quantity if existing else 0) + data.quantity
        if ps.stock_quantity < new_total_qty:
            raise BadRequestError(
                f"Số lượng trong kho không đủ (chỉ còn {ps.stock_quantity} cái)",
            )

        if existing:
            existing.quantity = new_total_qty
            db.commit()
            db.refresh(existing)
            return existing
        else:
            new_item = Cart(
                customer_id=customer_id,
                product_id=data.product_id,
                size_id=data.size_id,
                quantity=data.quantity,
            )
            db.add(new_item)
            db.commit()
            db.refresh(new_item)
            return new_item

    @staticmethod
    def update_quantity(db: Session, customer_id: int, cart_id: int, quantity: int) -> Optional[Cart]:
        item = db.query(Cart).filter(Cart.cart_id == cart_id, Cart.customer_id == customer_id).first()
        if not item:
            raise NotFoundError("Món hàng không tồn tại trong giỏ")

        if quantity <= 0:
            db.delete(item)
            db.commit()
            return None

        ps = db.query(ProductSize).filter(
            ProductSize.product_id == item.product_id,
            ProductSize.size_id == item.size_id
        ).first()
        if ps and ps.stock_quantity < quantity:
            raise BadRequestError(
                f"Số lượng trong kho không đủ (chỉ còn {ps.stock_quantity} cái)",
            )

        item.quantity = quantity
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def remove_item(db: Session, customer_id: int, cart_id: int) -> bool:
        item = db.query(Cart).filter(Cart.cart_id == cart_id, Cart.customer_id == customer_id).first()
        if not item:
            return False
        db.delete(item)
        db.commit()
        return True

    @staticmethod
    def clear_cart(db: Session, customer_id: int):
        db.query(Cart).filter(Cart.customer_id == customer_id).delete()
        db.commit()

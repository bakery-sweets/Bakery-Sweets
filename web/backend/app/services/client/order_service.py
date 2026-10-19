import uuid
from typing import List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.order import Order, OrderDetail, Cart, OrderStatusLog
from app.models.product import ProductSize
from app.schemas.client.order import CheckoutRequest

class ClientOrderService:
    @staticmethod
    def create_order(db: Session, customer_id: int, data: CheckoutRequest) -> Order:
        order_code = f"DH{uuid.uuid4().hex[:6].upper()}"
        total_quantity = 0
        total_cost = Decimal("0.00")
        details_to_create = []

        if data.items:
            items_source = data.items
        else:
            cart_items = db.query(Cart).filter(Cart.customer_id == customer_id).all()
            items_source = cart_items

        for item in items_source:
            ps = db.query(ProductSize).filter(
                ProductSize.product_id == item.product_id,
                ProductSize.size_id == item.size_id
            ).first()

            price = ps.price if ps else Decimal("0.00")
            item_total = price * item.quantity
            total_quantity += item.quantity
            total_cost += item_total

            details_to_create.append({
                "product_id": item.product_id,
                "size_id": item.size_id,
                "quantity": item.quantity,
                "unit_price": price,
                "total_price": item_total,
            })

        shipping_fee = Decimal("2.50") if total_cost > 0 else Decimal("0.00")
        final_cost = total_cost + shipping_fee

        order = Order(
            order_code=order_code,
            customer_id=customer_id,
            recipient_name=data.recipient_name,
            recipient_phone=data.recipient_phone,
            shipping_address=data.shipping_address,
            shipping_city=data.shipping_city,
            shipping_fee=shipping_fee,
            notes=data.notes,
            total_quantity=total_quantity,
            total_cost=total_cost,
            final_cost=final_cost,
            payment_method=data.payment_method,
            payment_status="Unpaid" if data.payment_method == "COD" else "Paid",
            status="Pending",
        )
        db.add(order)
        db.flush()

        for d in details_to_create:
            detail = OrderDetail(
                order_id=order.order_id,
                product_id=d["product_id"],
                size_id=d["size_id"],
                quantity=d["quantity"],
                unit_price=d["unit_price"],
                total_price=d["total_price"],
            )
            db.add(detail)

        # Log trạng thái khởi tạo
        log = OrderStatusLog(
            order_id=order.order_id,
            old_status=None,
            new_status="Pending",
            note="Khách hàng tạo đơn hàng mới",
        )
        db.add(log)

        # Xóa giỏ hàng sau khi đặt thành công
        db.query(Cart).filter(Cart.customer_id == customer_id).delete()

        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def get_my_orders(db: Session, customer_id: int) -> List[Order]:
        return db.query(Order).filter(Order.customer_id == customer_id).order_by(Order.order_id.desc()).all()

    @staticmethod
    def get_order_by_id(db: Session, customer_id: int, order_id: int) -> Optional[Order]:
        return db.query(Order).filter(Order.order_id == order_id, Order.customer_id == customer_id).first()

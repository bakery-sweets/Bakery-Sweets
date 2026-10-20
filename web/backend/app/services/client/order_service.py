import uuid
from typing import List, Optional
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.order import Order, OrderDetail, Cart, OrderStatusLog
from app.models.product import ProductSize
from app.schemas.client.order import CheckoutRequest

class ClientOrderService:
    @staticmethod
    def create_order(db: Session, customer_id: int, data: CheckoutRequest) -> Order:
        order_code = f"DH{uuid.uuid4().hex[:6].upper()}"

        if data.items:
            items_source = data.items
        else:
            items_source = db.query(Cart).filter(Cart.customer_id == customer_id).all()

        # order_detail có khóa chính (order_id, product_id, size_id) nên gộp các dòng trùng
        merged: dict[tuple[int, int], int] = {}
        for item in items_source:
            key = (item.product_id, item.size_id)
            merged[key] = merged.get(key, 0) + item.quantity

        if not merged:
            raise HTTPException(status_code=400, detail="Giỏ hàng đang trống")

        total_quantity = 0
        total_cost = Decimal("0.00")
        details_to_create = []

        for (product_id, size_id), quantity in merged.items():
            ps = db.query(ProductSize).filter(
                ProductSize.product_id == product_id,
                ProductSize.size_id == size_id
            ).first()
            if not ps:
                raise HTTPException(status_code=400, detail=f"Sản phẩm #{product_id} không có kích cỡ #{size_id}")

            total_quantity += quantity
            total_cost += ps.price * quantity
            details_to_create.append({
                "product_id": product_id,
                "size_id": size_id,
                "quantity": quantity,
                "price": ps.price,
            })

        discount_amount = Decimal("0.00")
        final_cost = total_cost - discount_amount

        order = Order(
            order_code=order_code,
            customer_id=customer_id,
            recipient_name=data.recipient_name,
            recipient_phone=data.recipient_phone,
            pickup_time=data.pickup_time,
            notes=data.notes,
            discount_amount=discount_amount,
            total_quantity=total_quantity,
            total_cost=total_cost,
            final_cost=final_cost,
            payment_method=data.payment_method,
            # Chưa có cổng xác nhận thanh toán nên mọi đơn mới đều là Unpaid
            payment_status="Unpaid",
            status="Pending",
        )
        db.add(order)
        db.flush()

        for d in details_to_create:
            db.add(OrderDetail(order_id=order.order_id, **d))

        # Log trạng thái khởi tạo
        db.add(OrderStatusLog(
            order_id=order.order_id,
            changed_by="Hệ thống",
            old_status=None,
            new_status="Pending",
            note="Khách hàng tạo đơn hàng mới",
        ))

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

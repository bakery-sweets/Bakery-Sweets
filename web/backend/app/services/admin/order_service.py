from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.order import Order, OrderStatusLog

class AdminOrderService:
    @staticmethod
    def get_all(db: Session, status: Optional[str] = None) -> List[Order]:
        query = db.query(Order)
        if status and status != "all":
            query = query.filter(Order.status == status)
        return query.order_by(Order.order_id.desc()).all()

    @staticmethod
    def get_by_id(db: Session, order_id: int) -> Optional[Order]:
        return db.query(Order).filter(Order.order_id == order_id).first()

    @staticmethod
    def update_status(db: Session, order_id: int, new_status: str, changed_by: str, note: Optional[str] = None) -> Optional[Order]:
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            return None

        old_status = order.status
        order.status = new_status

        log = OrderStatusLog(
            order_id=order.order_id,
            changed_by=changed_by,
            old_status=old_status,
            new_status=new_status,
            note=note,
        )
        db.add(log)
        db.commit()
        db.refresh(order)
        return order

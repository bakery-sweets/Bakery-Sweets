from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.order import Order, OrderStatusLog
from app.models.product import ProductSize

# Các bước chuyển trạng thái hợp lệ; Completed và Cancelled là trạng thái cuối
ALLOWED_TRANSITIONS = {
    "Pending": ("Processing", "Cancelled"),
    "Processing": ("Ready", "Cancelled"),
    "Ready": ("Completed", "Cancelled"),
    "Completed": (),
    "Cancelled": (),
}

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
        order = db.query(Order).filter(Order.order_id == order_id).with_for_update().first()
        if not order:
            return None

        old_status = order.status
        if new_status not in ALLOWED_TRANSITIONS.get(old_status, ()):
            raise HTTPException(
                status_code=400,
                detail=f"Không thể chuyển đơn hàng từ '{old_status}' sang '{new_status}'",
            )

        note = note.strip() if note else None

        if new_status == "Cancelled":
            if not note:
                raise HTTPException(status_code=400, detail="Vui lòng nhập lý do hủy đơn hàng")
            # Hoàn lại tồn kho cho các sản phẩm trong đơn
            for detail in order.details:
                ps = db.query(ProductSize).filter(
                    ProductSize.product_id == detail.product_id,
                    ProductSize.size_id == detail.size_id
                ).with_for_update().first()
                if ps:
                    ps.stock_quantity += detail.quantity

        if new_status == "Completed" and order.payment_status != "Paid":
            if order.payment_method != "COD":
                raise HTTPException(
                    status_code=400,
                    detail="Đơn hàng chưa được xác nhận thanh toán, không thể hoàn tất",
                )
            # Đơn COD: khách trả tiền mặt khi nhận bánh tại quầy
            order.payment_status = "Paid"
            note = f"{note} · Đã thu tiền mặt" if note else "Đã thu tiền mặt khi giao bánh"

        order.status = new_status
        db.add(OrderStatusLog(
            order_id=order.order_id,
            changed_by=changed_by,
            old_status=old_status,
            new_status=new_status,
            note=note,
        ))
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def confirm_payment(db: Session, order_id: int, changed_by: str, note: Optional[str] = None) -> Optional[Order]:
        order = db.query(Order).filter(Order.order_id == order_id).with_for_update().first()
        if not order:
            return None

        if order.status == "Cancelled":
            raise HTTPException(status_code=400, detail="Không thể xác nhận thanh toán cho đơn hàng đã hủy")
        if order.payment_status != "Unpaid":
            raise HTTPException(status_code=400, detail=f"Đơn hàng đang ở trạng thái thanh toán '{order.payment_status}'")

        order.payment_status = "Paid"
        # Trạng thái đơn không đổi, ghi log để hiện trên timeline
        db.add(OrderStatusLog(
            order_id=order.order_id,
            changed_by=changed_by,
            old_status=order.status,
            new_status=order.status,
            note=(note.strip() if note and note.strip() else None) or "Xác nhận đã thanh toán",
        ))
        db.commit()
        db.refresh(order)
        return order

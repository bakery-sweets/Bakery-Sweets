from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.exceptions import BadRequestError
from thesweets_common.models.order import Order, OrderStatusLog
from thesweets_common.models.product import ProductSize
from thesweets_common.models.notification import Notification
from app.services.realtime_service import RealtimeService

# Các bước chuyển trạng thái hợp lệ; Completed và Cancelled là trạng thái cuối
ALLOWED_TRANSITIONS = {
    "Pending": ("Processing", "Cancelled"),
    "Processing": ("Ready", "Cancelled"),
    "Ready": ("Completed", "Cancelled"),
    "Completed": (),
    "Cancelled": (),
}

# Tên trạng thái hiển thị cho khách trong thông báo
STATUS_LABELS = {
    "Pending": "Chờ xác nhận",
    "Processing": "Đang chuẩn bị bánh",
    "Ready": "Bánh đã sẵn sàng, mời bạn tới quầy nhận",
    "Completed": "Đã hoàn tất",
    "Cancelled": "Đã bị hủy",
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
            raise BadRequestError(
                f"Không thể chuyển đơn hàng từ '{old_status}' sang '{new_status}'",
            )

        note = note.strip() if note else None

        if new_status == "Cancelled":
            if not note:
                raise BadRequestError("Vui lòng nhập lý do hủy đơn hàng")
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
                raise BadRequestError(
                    "Đơn hàng chưa được xác nhận thanh toán, không thể hoàn tất",
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

        # Lưu thông báo cho khách (hiện trong mục Thông báo của App) rồi đẩy realtime
        customer_phone = order.customer.phone if order.customer else None
        notif = None
        if customer_phone:
            message = f"Đơn hàng #{order.order_code}: {STATUS_LABELS.get(new_status, new_status)}."
            if note:
                message += f" Ghi chú: {note}"
            notif = Notification(
                phone=customer_phone,
                title=f"Đơn hàng #{order.order_code} đã cập nhật",
                message=message,
                type="order",
                reference_id=order.order_id,
            )
            db.add(notif)

        db.commit()
        db.refresh(order)

        if notif:
            RealtimeService.to_user(customer_phone, "order_status_updated", {
                "title": notif.title,
                "message": notif.message,
                "order_id": order.order_id,
                "order_code": order.order_code,
                "old_status": old_status,
                "new_status": new_status,
            })
        RealtimeService.to_staff("order_updated", {"order_id": order.order_id, "status": new_status})
        if new_status == "Cancelled":
            RealtimeService.stock_changed(db, [(d.product_id, d.size_id) for d in order.details])
        return order

    @staticmethod
    def confirm_payment(db: Session, order_id: int, changed_by: str, note: Optional[str] = None) -> Optional[Order]:
        order = db.query(Order).filter(Order.order_id == order_id).with_for_update().first()
        if not order:
            return None

        if order.status == "Cancelled":
            raise BadRequestError("Không thể xác nhận thanh toán cho đơn hàng đã hủy")
        if order.payment_status != "Unpaid":
            raise BadRequestError(f"Đơn hàng đang ở trạng thái thanh toán '{order.payment_status}'")

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

        # Trạng thái thanh toán đổi: các màn hình đơn hàng tự tải lại, không cần hiện thông báo
        if order.customer:
            RealtimeService.to_user(order.customer.phone, "order_updated", {"order_id": order.order_id})
        RealtimeService.to_staff("order_updated", {"order_id": order.order_id, "status": order.status})
        return order

from typing import List
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from thesweets_common.models.notification import Notification

class NotificationService:
    @staticmethod
    def get_notifications(db: Session, phone: str) -> List[Notification]:
        # App chỉ hiện thông báo trạng thái đơn hàng, thông báo voucher chỉ dành cho Web
        return db.query(Notification).filter(
            Notification.phone == phone,
            Notification.type == "order",
        ).order_by(Notification.created_at.desc()).all()

    @staticmethod
    def mark_as_read(db: Session, phone: str, notification_id: int) -> None:
        notif = db.query(Notification).filter(
            Notification.notification_id == notification_id,
            Notification.phone == phone
        ).first()

        if not notif:
            raise NotFoundError("Không tìm thấy thông báo")

        notif.is_read = True
        db.commit()

    @staticmethod
    def mark_all_as_read(db: Session, phone: str) -> None:
        # Chỉ đánh dấu thông báo đơn hàng để không ảnh hưởng thông báo voucher bên Web
        db.query(Notification).filter(
            Notification.phone == phone,
            Notification.type == "order",
            Notification.is_read == False
        ).update({"is_read": True})
        db.commit()

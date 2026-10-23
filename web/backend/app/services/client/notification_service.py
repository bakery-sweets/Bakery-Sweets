from datetime import datetime
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.promotion import Promotion
from app.models.user import User

def _money(v) -> str:
    return f"{int(v):,}".replace(",", ".") + "đ"

def _tiers_text(promo: Promotion) -> str:
    parts = []
    for t in sorted(promo.invoice_promotions, key=lambda t: t.min_order_value):
        cap = f" tối đa {_money(t.max_discount_value)}" if t.max_discount_value is not None else ""
        parts.append(f"giảm {t.discount_percentage.normalize():f}%{cap} cho đơn từ {_money(t.min_order_value)}")
    return "; ".join(parts)

class ClientNotificationService:
    @staticmethod
    def get_recent(db: Session, phone: str, limit: int = 5) -> Tuple[List[Notification], int]:
        items = (
            db.query(Notification)
            .filter(Notification.phone == phone)
            .order_by(Notification.created_at.desc(), Notification.notification_id.desc())
            .limit(limit)
            .all()
        )
        unread = db.query(Notification).filter(Notification.phone == phone, Notification.is_read.is_(False)).count()
        return items, unread

    @staticmethod
    def mark_all_read(db: Session, phone: str) -> None:
        db.query(Notification).filter(
            Notification.phone == phone,
            Notification.is_read.is_(False),
        ).update({"is_read": True}, synchronize_session=False)
        db.commit()

    @staticmethod
    def notify_promotion(db: Session, promo: Promotion, is_new: bool) -> int:
        """
        Gửi thông báo voucher tới mọi khách hàng đang hoạt động (mỗi khách một dòng vì
        notifications.phone bắt buộc). Chỉ gửi khi voucher đang chạy để khách không nhận mã chưa dùng được.
        Không commit, để nằm chung transaction với thao tác lưu voucher.
        """
        if promo.status != "Active" or promo.end_date < datetime.now():
            return 0

        phones = [
            phone
            for (phone,) in db.query(User.phone).filter(User.role == "customer", User.status == "active").all()
        ]
        if is_new:
            title = f"Voucher mới: {promo.promotion_code}"
        else:
            title = f"Voucher {promo.promotion_code} vừa được cập nhật"
        detail = promo.description or _tiers_text(promo)
        message = f"{promo.promotion_name} - {detail}. Hiệu lực đến {promo.end_date:%d/%m/%Y}."

        db.add_all([
            Notification(
                phone=phone,
                title=title,
                message=message,
                type="promotion",
                reference_id=promo.promotion_id,
            )
            for phone in phones
        ])
        return len(phones)

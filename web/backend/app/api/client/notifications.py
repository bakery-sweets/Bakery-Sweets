from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.promotion import Promotion
from app.models.user import User
from app.services.client.notification_service import ClientNotificationService
from app.schemas.client.notification import NotificationOut, NotificationListOut
from app.schemas.common import ResponseBase

router = APIRouter()

@router.get("", response_model=ResponseBase[NotificationListOut], summary="Lấy các thông báo gần nhất của tôi")
def list_my_notifications(
    limit: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, unread = ClientNotificationService.get_recent(db, current_user.phone, limit)

    promo_ids = {n.reference_id for n in items if n.type == "promotion" and n.reference_id}
    codes = dict(
        db.query(Promotion.promotion_id, Promotion.promotion_code).filter(Promotion.promotion_id.in_(promo_ids)).all()
    ) if promo_ids else {}

    return ResponseBase(data=NotificationListOut(
        items=[
            NotificationOut(
                notification_id=n.notification_id,
                title=n.title,
                message=n.message,
                type=n.type,
                reference_id=n.reference_id,
                promotion_code=codes.get(n.reference_id) if n.type == "promotion" else None,
                is_read=bool(n.is_read),
                created_at=n.created_at,
            )
            for n in items
        ],
        unread_count=unread,
    ))

@router.put("/read-all", response_model=ResponseBase, summary="Đánh dấu đã đọc tất cả thông báo")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ClientNotificationService.mark_all_read(db, current_user.phone)
    return ResponseBase(message="Đã đánh dấu tất cả thông báo là đã đọc")

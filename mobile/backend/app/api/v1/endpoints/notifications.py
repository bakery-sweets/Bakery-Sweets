from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.config.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationOut
from app.core.security import get_current_user

router = APIRouter()

@router.get("/notifications", response_model=List[NotificationOut])
def get_my_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifs = db.query(Notification).filter(
        Notification.user_name == current_user.user_name
    ).order_by(Notification.created_at.desc()).all()
    return notifs

@router.put("/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(
        Notification.notification_id == notification_id,
        Notification.user_name == current_user.user_name
    ).first()

    if not notif:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo")

    notif.is_read = True
    db.commit()
    return {"message": "Đã đánh dấu thông báo là đã đọc"}

@router.put("/notifications/read-all")
def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_name == current_user.user_name,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "Đã đánh dấu tất cả là đã đọc"}

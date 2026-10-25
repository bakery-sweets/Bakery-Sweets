from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.notification import NotificationOut
from app.services.notification_service import NotificationService

router = APIRouter()

@router.get("/notifications", response_model=List[NotificationOut])
def get_my_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return NotificationService.get_notifications(db, current_user.phone)

@router.put("/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    NotificationService.mark_as_read(db, current_user.phone, notification_id)
    return {"message": "Đã đánh dấu thông báo là đã đọc"}

@router.put("/notifications/read-all")
def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    NotificationService.mark_all_as_read(db, current_user.phone)
    return {"message": "Đã đánh dấu tất cả là đã đọc"}

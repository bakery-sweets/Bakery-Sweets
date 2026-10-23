from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class NotificationOut(BaseModel):
    notification_id: int
    title: str
    message: str
    type: str
    reference_id: Optional[int] = None
    # Mã voucher (khi type = 'promotion') để khách sao chép nhanh
    promotion_code: Optional[str] = None
    is_read: bool = False
    created_at: Optional[datetime] = None

class NotificationListOut(BaseModel):
    items: List[NotificationOut] = []
    unread_count: int = 0

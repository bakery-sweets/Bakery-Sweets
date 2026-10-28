import hmac
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import settings
from app.schemas.event import RealtimeEventIn
from app.services.connection_manager import manager

router = APIRouter()

@router.post("/internal/events", include_in_schema=False)
async def publish_event(req: RealtimeEventIn, x_internal_key: Optional[str] = Header(None)):
    """API nội bộ: Web Backend / Mobile Backend gửi sự kiện để phát tới App & Web"""
    if not x_internal_key or not hmac.compare_digest(x_internal_key, settings.INTERNAL_API_KEY):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sai khóa nội bộ")

    manager.publish(req)
    return {"message": "Đã phát sự kiện"}

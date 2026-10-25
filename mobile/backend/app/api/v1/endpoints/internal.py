import hmac
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import settings
from app.schemas.realtime import RealtimeEventIn
from app.services.realtime_service import RealtimeService

router = APIRouter()

@router.post("/internal/events", include_in_schema=False)
def publish_event(req: RealtimeEventIn, x_internal_key: Optional[str] = Header(None)):
    """API nội bộ: Web Backend gửi sự kiện để trung tâm realtime phát tới App & Web"""
    if not x_internal_key or not hmac.compare_digest(x_internal_key, settings.INTERNAL_API_KEY):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sai khóa nội bộ")

    if req.target == "user":
        if req.disconnect:
            RealtimeService.kick_user(req.phone, req.event, req.data)
        else:
            RealtimeService.to_user(req.phone, req.event, req.data)
    elif req.target == "staff":
        RealtimeService.to_staff(req.event, req.data)
    else:
        RealtimeService.broadcast(req.event, req.data)

    return {"message": "Đã phát sự kiện"}

import json
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from app.services.connection_manager import manager
from app.services.identity_service import IdentityService

router = APIRouter()

@router.websocket("/ws")
async def realtime_socket(websocket: WebSocket, token: Optional[str] = None):
    """
    Kênh realtime dùng chung cho App & Web.
    Gửi kèm ?token=<JWT> để nhận sự kiện riêng của tài khoản (và của staff nếu là admin/staff);
    không có token vẫn nhận được sự kiện công khai như tồn kho, sản phẩm thay đổi.
    """
    phone, is_staff = await run_in_threadpool(IdentityService.resolve, token)
    await manager.connect(websocket, phone, is_staff)
    try:
        await websocket.send_json({
            "event": "connected",
            "authenticated": phone is not None,
            "is_staff": is_staff,
        })
        while True:
            data = await websocket.receive_text()
            try:
                if json.loads(data).get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

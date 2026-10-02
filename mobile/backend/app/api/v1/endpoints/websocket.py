from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import manager
import json

router = APIRouter()

@router.websocket("/ws/orders/{order_id}")
async def websocket_order_tracking(websocket: WebSocket, order_id: int):
    await manager.connect_order(order_id, websocket)
    try:
        await websocket.send_json({
            "event": "connected",
            "message": f"Đã kết nối theo dõi thời gian thực đơn hàng #{order_id}",
            "order_id": order_id
        })
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect_order(order_id, websocket)
    except Exception:
        manager.disconnect_order(order_id, websocket)

@router.websocket("/ws/notifications/{user_name}")
async def websocket_user_notifications(websocket: WebSocket, user_name: str):
    await manager.connect_user(user_name, websocket)
    try:
        await websocket.send_json({
            "event": "connected",
            "message": f"Đã kết nối kênh thông báo tức thời cho {user_name}",
        })
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect_user(user_name, websocket)
    except Exception:
        manager.disconnect_user(user_name, websocket)

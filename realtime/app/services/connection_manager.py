import asyncio
from dataclasses import dataclass
from typing import Coroutine, Dict, Optional, Set
from fastapi import WebSocket

from app.schemas.event import RealtimeEventIn

# Mã đóng kết nối khi tài khoản bị khóa (dải 4000-4999 dành cho ứng dụng)
CLOSE_ACCOUNT_LOCKED = 4403

@dataclass
class ClientInfo:
    phone: Optional[str]  # None = khách vãng lai, chỉ nhận sự kiện công khai
    is_staff: bool

class ConnectionManager:
    """
    Quản lý kết nối WebSocket của App Flutter và Web React.
    Mỗi kết nối thuộc 1 trong 3 nhóm nhận tin:
      - user  : theo số điện thoại (đơn hàng, giỏ hàng, khóa tài khoản của chính người đó)
      - staff : admin / staff (đơn mới, đơn được cập nhật)
      - all   : mọi kết nối kể cả khách vãng lai (tồn kho, sản phẩm thay đổi)
    """

    def __init__(self):
        self.connections: Dict[WebSocket, ClientInfo] = {}
        self._tasks: Set[asyncio.Task] = set()

    async def connect(self, websocket: WebSocket, phone: Optional[str], is_staff: bool):
        await websocket.accept()
        self.connections[websocket] = ClientInfo(phone=phone, is_staff=is_staff)

    def disconnect(self, websocket: WebSocket):
        self.connections.pop(websocket, None)

    async def _send(self, websockets, data: dict):
        for ws in list(websockets):
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(ws)

    async def send_to_user(self, phone: str, data: dict):
        await self._send([ws for ws, c in self.connections.items() if c.phone == phone], data)

    async def send_to_staff(self, data: dict):
        await self._send([ws for ws, c in self.connections.items() if c.is_staff], data)

    async def broadcast(self, data: dict):
        await self._send(self.connections.keys(), data)

    async def kick_user(self, phone: str, data: dict):
        """Gửi sự kiện cuối cùng rồi đóng mọi kết nối của user (dùng khi tài khoản bị khóa)"""
        targets = [ws for ws, c in self.connections.items() if c.phone == phone]
        await self._send(targets, data)
        for ws in targets:
            self.disconnect(ws)
            try:
                await ws.close(code=CLOSE_ACCOUNT_LOCKED)
            except Exception:
                pass

    def _dispatch(self, coro: Coroutine):
        """Chạy việc gửi tin nền để API nội bộ trả lời ngay, không chờ gửi xong tới mọi kết nối"""
        task = asyncio.get_running_loop().create_task(coro)
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    def publish(self, event: RealtimeEventIn):
        message = {"event": event.event, **event.data}
        if event.target == "user":
            if event.disconnect:
                self._dispatch(self.kick_user(event.phone, message))
            else:
                self._dispatch(self.send_to_user(event.phone, message))
        elif event.target == "staff":
            self._dispatch(self.send_to_staff(message))
        else:
            self._dispatch(self.broadcast(message))

manager = ConnectionManager()

import asyncio
from dataclasses import dataclass
from typing import Coroutine, Dict, Optional, Set
from fastapi import WebSocket

# Mã đóng kết nối khi tài khoản bị khóa (dải 4000-4999 dành cho ứng dụng)
CLOSE_ACCOUNT_LOCKED = 4403

@dataclass
class ClientInfo:
    phone: Optional[str]  # None = khách vãng lai, chỉ nhận sự kiện công khai
    is_staff: bool

class ConnectionManager:
    """
    Trung tâm realtime dùng chung cho App Flutter và Web React.
    Mỗi kết nối thuộc 1 trong 3 nhóm nhận tin:
      - user  : theo số điện thoại (đơn hàng, giỏ hàng, khóa tài khoản của chính người đó)
      - staff : admin / staff (đơn mới, đơn được cập nhật)
      - all   : mọi kết nối kể cả khách vãng lai (tồn kho, sản phẩm thay đổi)
    """

    def __init__(self):
        self.connections: Dict[WebSocket, ClientInfo] = {}
        self.loop: Optional[asyncio.AbstractEventLoop] = None
        self._tasks: Set[asyncio.Task] = set()

    async def connect(self, websocket: WebSocket, phone: Optional[str], is_staff: bool):
        await websocket.accept()
        self.loop = asyncio.get_running_loop()
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

    def dispatch(self, coro: Coroutine):
        """
        Chạy việc gửi tin ở chế độ "bắn rồi quên" từ bất kỳ đâu:
        trong event loop (endpoint async) hoặc từ thread pool (endpoint sync của FastAPI).
        """
        try:
            task = asyncio.get_running_loop().create_task(coro)
            self._tasks.add(task)
            task.add_done_callback(self._tasks.discard)
        except RuntimeError:
            if self.loop and self.loop.is_running():
                asyncio.run_coroutine_threadsafe(coro, self.loop)
            else:
                # Chưa có kết nối nào từng mở thì cũng không có ai để gửi
                coro.close()

manager = ConnectionManager()

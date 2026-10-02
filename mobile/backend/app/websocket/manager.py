from typing import Dict, List
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        # user_name -> list[WebSocket] (cho thông báo in-app realtime)
        self.user_connections: Dict[str, List[WebSocket]] = {}
        # order_id -> list[WebSocket] (cho màn hình theo dõi đơn hàng)
        self.order_connections: Dict[int, List[WebSocket]] = {}

    async def connect_user(self, user_name: str, websocket: WebSocket):
        await websocket.accept()
        if user_name not in self.user_connections:
            self.user_connections[user_name] = []
        self.user_connections[user_name].append(websocket)

    def disconnect_user(self, user_name: str, websocket: WebSocket):
        if user_name in self.user_connections:
            if websocket in self.user_connections[user_name]:
                self.user_connections[user_name].remove(websocket)
            if not self.user_connections[user_name]:
                del self.user_connections[user_name]

    async def send_to_user(self, user_name: str, data: dict):
        if user_name in self.user_connections:
            dead_connections = []
            for connection in self.user_connections[user_name]:
                try:
                    await connection.send_json(data)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.disconnect_user(user_name, dead)

    async def connect_order(self, order_id: int, websocket: WebSocket):
        await websocket.accept()
        if order_id not in self.order_connections:
            self.order_connections[order_id] = []
        self.order_connections[order_id].append(websocket)

    def disconnect_order(self, order_id: int, websocket: WebSocket):
        if order_id in self.order_connections:
            if websocket in self.order_connections[order_id]:
                self.order_connections[order_id].remove(websocket)
            if not self.order_connections[order_id]:
                del self.order_connections[order_id]

    async def broadcast_order_update(self, order_id: int, data: dict):
        if order_id in self.order_connections:
            dead_connections = []
            for connection in self.order_connections[order_id]:
                try:
                    await connection.send_json(data)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.disconnect_order(order_id, dead)

manager = ConnectionManager()

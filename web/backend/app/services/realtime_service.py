import json
import logging
import threading
import urllib.request
from typing import Iterable, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from thesweets_common.models.product import ProductSize

logger = logging.getLogger(__name__)

class RealtimeService:
    """
    Gửi sự kiện tới Realtime Server (WebSocket chạy riêng) qua API nội bộ,
    để App Flutter và Web React đang mở cùng nhận được.
    Gửi ở thread nền ("bắn rồi quên"): Realtime Server không chạy cũng không làm hỏng nghiệp vụ.
    """

    @staticmethod
    def _post(payload: dict):
        req = urllib.request.Request(
            f"{settings.REALTIME_URL.rstrip('/')}/internal/events",
            data=json.dumps(payload, default=str).encode("utf-8"),
            headers={"Content-Type": "application/json", "X-Internal-Key": settings.INTERNAL_API_KEY},
            method="POST",
        )
        try:
            urllib.request.urlopen(req, timeout=3).close()
        except Exception as e:
            logger.warning("[Realtime] Không gửi được sự kiện '%s': %s", payload.get("event"), e)

    @staticmethod
    def _publish(target: str, event: str, data: Optional[dict] = None, phone: Optional[str] = None, disconnect: bool = False):
        payload = {
            "target": target,
            "phone": phone,
            "event": event,
            "data": data or {},
            "disconnect": disconnect,
        }
        threading.Thread(target=RealtimeService._post, args=(payload,), daemon=True).start()

    @staticmethod
    def to_user(phone: str, event: str, data: Optional[dict] = None):
        RealtimeService._publish("user", event, data, phone=phone)

    @staticmethod
    def to_staff(event: str, data: Optional[dict] = None):
        RealtimeService._publish("staff", event, data)

    @staticmethod
    def broadcast(event: str, data: Optional[dict] = None):
        RealtimeService._publish("all", event, data)

    @staticmethod
    def kick_user(phone: str, event: str, data: Optional[dict] = None):
        """Gửi sự kiện rồi đóng mọi kết nối realtime của user (dùng khi khóa tài khoản)"""
        RealtimeService._publish("user", event, data, phone=phone, disconnect=True)

    @staticmethod
    def stock_changed(db: Session, pairs: Iterable[Tuple[int, int]]):
        """Phát tồn kho mới của các cặp (product_id, size_id) tới mọi người đang xem sản phẩm / giỏ hàng"""
        items: List[dict] = []
        for product_id, size_id in set(pairs):
            ps = db.query(ProductSize).filter(
                ProductSize.product_id == product_id,
                ProductSize.size_id == size_id,
            ).first()
            if ps:
                items.append({"product_id": product_id, "size_id": size_id, "stock_quantity": ps.stock_quantity})
        if items:
            RealtimeService.broadcast("stock_updated", {"items": items})

    @staticmethod
    def products_changed(product_id: int, action: str):
        """Sản phẩm được thêm / sửa / ngừng kinh doanh: client tải lại danh sách sản phẩm"""
        RealtimeService.broadcast("products_changed", {"product_id": product_id, "action": action})

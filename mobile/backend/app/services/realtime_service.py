from typing import Iterable, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.config.database import SessionLocal
from app.core.security import decode_access_token
from app.services.auth_service import AuthService, STAFF_ROLES
from app.services.product_service import ProductService
from app.websocket.manager import manager

class RealtimeService:
    """
    Phát sự kiện realtime tới App & Web. Mọi hàm đều đồng bộ và "bắn rồi quên",
    gọi được cả trong endpoint sync lẫn async; lỗi gửi tin không ảnh hưởng nghiệp vụ.
    """

    @staticmethod
    def resolve_identity(token: Optional[str]) -> Tuple[Optional[str], bool]:
        """Xác định (số điện thoại, là staff?) từ JWT; token thiếu / sai / tài khoản bị khóa => khách vãng lai"""
        if not token:
            return None, False
        payload = decode_access_token(token)
        identifier = payload.get("sub") if payload else None
        if not identifier:
            return None, False

        with SessionLocal() as db:
            user = AuthService.get_user_by_identifier(db, identifier)
            if not user or user.status != "active":
                return None, False
            return user.phone, user.role in STAFF_ROLES

    @staticmethod
    def _message(event: str, data: Optional[dict]) -> dict:
        return {"event": event, **(data or {})}

    @staticmethod
    def to_user(phone: str, event: str, data: Optional[dict] = None):
        manager.dispatch(manager.send_to_user(phone, RealtimeService._message(event, data)))

    @staticmethod
    def to_staff(event: str, data: Optional[dict] = None):
        manager.dispatch(manager.send_to_staff(RealtimeService._message(event, data)))

    @staticmethod
    def broadcast(event: str, data: Optional[dict] = None):
        manager.dispatch(manager.broadcast(RealtimeService._message(event, data)))

    @staticmethod
    def kick_user(phone: str, event: str, data: Optional[dict] = None):
        manager.dispatch(manager.kick_user(phone, RealtimeService._message(event, data)))

    @staticmethod
    def stock_snapshot(db: Session, pairs: Iterable[Tuple[int, int]]) -> List[dict]:
        """Tồn kho hiện tại của các cặp (product_id, size_id) để gửi kèm sự kiện stock_updated"""
        result = []
        for product_id, size_id in set(pairs):
            ps = ProductService.get_size(db, product_id, size_id)
            if ps:
                result.append({
                    "product_id": product_id,
                    "size_id": size_id,
                    "stock_quantity": ps.stock_quantity,
                })
        return result

    @staticmethod
    def stock_changed(db: Session, pairs: Iterable[Tuple[int, int]]):
        items = RealtimeService.stock_snapshot(db, pairs)
        if items:
            RealtimeService.broadcast("stock_updated", {"items": items})

from typing import Optional, Tuple
from sqlalchemy import or_
from thesweets_common.models.user import User

from app.core.security import decode_access_token
from app.database.session import SessionLocal

STAFF_ROLES = ("admin", "staff")

class IdentityService:
    @staticmethod
    def resolve(token: Optional[str]) -> Tuple[Optional[str], bool]:
        """Xác định (số điện thoại, là staff?) từ JWT; token thiếu / sai / tài khoản bị khóa => khách vãng lai"""
        if not token:
            return None, False
        payload = decode_access_token(token)
        identifier = payload.get("sub") if payload else None
        if not identifier:
            return None, False

        with SessionLocal() as db:
            row = (
                db.query(User.phone, User.role, User.status)
                .filter(or_(User.phone == identifier, User.email == identifier))
                .first()
            )
        if not row or row.status != "active":
            return None, False
        return row.phone, row.role in STAFF_ROLES

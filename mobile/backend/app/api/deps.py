from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.security import decode_access_token
from thesweets_common.models.user import User
from app.services.auth_service import AuthService, STAFF_ROLES

security_bearer = HTTPBearer(auto_error=False)

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not auth or not auth.credentials:
        raise credentials_exception

    payload = decode_access_token(auth.credentials)
    username: Optional[str] = payload.get("sub") if payload else None
    if not username:
        raise credentials_exception

    user = AuthService.get_user_by_identifier(db, username)
    if user is None:
        raise credentials_exception
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa",
        )
    return user

def get_optional_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Dependency lấy user hiện tại nếu có token hợp lệ, không bắt buộc (trả về None nếu chưa đăng nhập)"""
    if not auth or not auth.credentials:
        return None
    payload = decode_access_token(auth.credentials)
    username: Optional[str] = payload.get("sub") if payload else None
    if not username:
        return None
    user = AuthService.get_user_by_identifier(db, username)
    if user and user.status == "active":
        return user
    return None

def get_current_customer(current_user: User = Depends(get_current_user)) -> User:
    """Bắt buộc user đã đăng nhập và có hồ sơ khách hàng (dùng cho giỏ hàng, đặt đơn)"""
    if not current_user.customer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản này chưa có hồ sơ khách hàng để mua hàng",
        )
    return current_user

def require_staff(current_user: User = Depends(get_current_user)) -> User:
    """Chỉ cho phép admin / staff thực hiện thao tác quản lý"""
    if current_user.role not in STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thực hiện thao tác này",
        )
    return current_user

__all__ = [
    "get_db",
    "get_current_user",
    "get_optional_current_user",
    "get_current_customer",
    "require_staff",
]

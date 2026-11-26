from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kiểm tra mật khẩu nhập vào khớp với chuỗi băm."""
    try:
        # Convert PHP $2y$ prefix to $2b$ if needed for Python bcrypt compatibility
        if hashed_password and hashed_password.startswith("$2y$"):
            hashed_password = "$2b$" + hashed_password[4:]
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Tạo chuỗi băm Bcrypt cho mật khẩu."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None) -> str:
    """Tạo JSON Web Token (JWT) cho phiên đăng nhập."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# ===== Token tải hóa đơn cho khách đặt hàng không đăng nhập =====
# Ký bằng khóa riêng (suy ra từ SECRET_KEY) nên không server nào giải mã được nó như token đăng nhập,
# và chỉ mở được hóa đơn của đúng 1 đơn hàng.
GUEST_INVOICE_TTL = timedelta(days=7)


def _guest_invoice_key() -> str:
    return f"{settings.SECRET_KEY}:guest-invoice"


def create_guest_invoice_token(order_id: int) -> str:
    payload = {"oid": order_id, "exp": datetime.now(timezone.utc) + GUEST_INVOICE_TTL}
    return jwt.encode(payload, _guest_invoice_key(), algorithm=settings.ALGORITHM)


def verify_guest_invoice_token(token: str, order_id: int) -> bool:
    try:
        payload = jwt.decode(token, _guest_invoice_key(), algorithms=[settings.ALGORITHM])
    except JWTError:
        return False
    return payload.get("oid") == order_id


def decode_access_token(token: str) -> Union[dict[str, Any], None]:
    """Giải mã và kiểm tra tính hợp lệ của JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

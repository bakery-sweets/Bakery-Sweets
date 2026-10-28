from typing import Optional
from jose import JWTError, jwt

from app.core.config import settings

def decode_access_token(token: str) -> Optional[dict]:
    """Giải mã JWT do Web / Mobile Backend cấp, trả về payload hoặc None nếu token sai / hết hạn"""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None

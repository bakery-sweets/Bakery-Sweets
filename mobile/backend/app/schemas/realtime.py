from typing import Literal, Optional
from pydantic import BaseModel, model_validator

class RealtimeEventIn(BaseModel):
    """Sự kiện do Web Backend gửi sang để phát tới các kết nối WebSocket"""
    target: Literal["user", "staff", "all"]
    phone: Optional[str] = None
    event: str
    data: dict = {}
    # Đóng các kết nối của user sau khi gửi (dùng khi khóa tài khoản)
    disconnect: bool = False

    @model_validator(mode="after")
    def check_phone(self):
        if self.target == "user" and not self.phone:
            raise ValueError("Sự kiện gửi tới user phải có phone")
        return self

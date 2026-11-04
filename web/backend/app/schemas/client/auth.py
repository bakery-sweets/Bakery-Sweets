import re
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator

class ClientRegisterRequest(BaseModel):
    phone: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str

    # Bỏ khoảng trắng để "0911 111 111" khớp với hồ sơ "0911111111" nhân viên đã tạo khi khách đặt qua điện thoại
    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, v):
        return re.sub(r"\s+", "", str(v or ""))

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def strip_name(cls, v):
        return str(v or "").strip()

class ClientLoginRequest(BaseModel):
    phone: str
    password: str

class ClientTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    phone: str
    email: str
    role: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class ClientProfileOut(BaseModel):
    phone: str
    email: str
    first_name: str
    last_name: str
    role: Optional[str] = None

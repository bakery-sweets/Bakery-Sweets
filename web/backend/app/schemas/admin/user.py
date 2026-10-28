import re
from typing import Literal, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from pydantic_core import PydanticCustomError

PHONE_PATTERN = re.compile(r"^0\d{9}$")

class AdminUserItemOut(BaseModel):
    phone: str
    email: str
    role: str
    status: str
    lock_reason: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    created_at: Optional[datetime] = None

class AdminUserCreateIn(BaseModel):
    phone: str
    email: EmailStr
    password: str = Field(..., min_length=6, description="Mật khẩu khởi tạo tối thiểu 6 ký tự")
    role: Literal["admin", "staff", "customer"] = "staff"
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v):
        phone = re.sub(r"\s+", "", str(v or ""))
        if not PHONE_PATTERN.match(phone):
            raise PydanticCustomError("phone_format", "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0")
        return phone

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        return str(v or "").strip().lower()

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def strip_name(cls, v):
        return str(v or "").strip()

class UserStatusUpdateIn(BaseModel):
    reason: Optional[str] = Field(None, max_length=255)

class AdminUserUpdateIn(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[Literal["admin", "staff", "customer"]] = None
    status: Optional[Literal["active", "locked"]] = None
    lock_reason: Optional[str] = Field(None, max_length=255)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        return str(v).strip().lower() if v else None

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def strip_names(cls, v):
        if v is None:
            return None
        name = str(v).strip()
        if not name:
            raise PydanticCustomError("name_blank", "Họ và tên không được để trống")
        return name

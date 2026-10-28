from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class ProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, description="Mật khẩu mới tối thiểu 6 ký tự")

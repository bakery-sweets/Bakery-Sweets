from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.api.client.auth import to_profile_out
from app.core.security import verify_password, get_password_hash
from app.models.user import User
from app.schemas.client.auth import ClientProfileOut
from app.schemas.common import ResponseBase

router = APIRouter()

class ProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, description="Mật khẩu mới tối thiểu 6 ký tự")

@router.put("", response_model=ResponseBase[ClientProfileOut], summary="Cập nhật thông tin cá nhân")
def update_profile(
    data: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.customer:
        raise HTTPException(status_code=400, detail="Tài khoản chưa có hồ sơ khách hàng")

    cust = user.customer
    if data.first_name is not None:
        cust.first_name = data.first_name.strip()
    if data.last_name is not None:
        cust.last_name = data.last_name.strip()
    if data.email is not None and data.email != user.email:
        existing = db.query(User).filter(User.email == data.email, User.phone != user.phone).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email này đã được sử dụng bởi tài khoản khác")
        user.email = data.email

    db.commit()
    db.refresh(user)
    return ResponseBase(message="Cập nhật thông tin thành công", data=to_profile_out(user))

@router.post("/change-password", response_model=ResponseBase, summary="Đổi mật khẩu")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(data.old_password, user.password):
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không chính xác")

    if data.old_password == data.new_password:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải khác mật khẩu cũ")

    user.password = get_password_hash(data.new_password)
    db.commit()
    return ResponseBase(message="Đổi mật khẩu thành công")

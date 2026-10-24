import re
from typing import List, Literal, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from pydantic_core import PydanticCustomError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.core.security import get_password_hash
from app.models.user import User, Customer
from app.schemas.common import ResponseBase

router = APIRouter()

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

def to_item_out(u: User) -> AdminUserItemOut:
    return AdminUserItemOut(
        phone=u.phone,
        email=u.email,
        role=u.role,
        status=u.status,
        lock_reason=u.lock_reason,
        first_name=u.customer.first_name if u.customer else None,
        last_name=u.customer.last_name if u.customer else None,
        created_at=u.created_at,
    )

@router.get("", response_model=ResponseBase[List[AdminUserItemOut]], summary="Danh sách tài khoản")
def list_users(
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(User)
    if role and role != "all":
        query = query.filter(User.role == role)
    users = query.order_by(User.created_at.desc()).all()
    return ResponseBase(data=[to_item_out(u) for u in users])

@router.post("", response_model=ResponseBase[AdminUserItemOut], status_code=status.HTTP_201_CREATED, summary="Cấp tài khoản mới")
def create_user(
    data: AdminUserCreateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if db.query(User).filter(User.phone == data.phone).first():
        raise HTTPException(status_code=400, detail="Số điện thoại này đã được đăng ký tài khoản")

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email này đã được sử dụng")

    new_user = User(
        phone=data.phone,
        email=data.email,
        password=get_password_hash(data.password),
        role=data.role,
        status="active",
    )
    new_customer = Customer(
        phone=data.phone,
        first_name=data.first_name,
        last_name=data.last_name,
    )
    db.add_all([new_user, new_customer])
    try:
        db.commit()
    except IntegrityError:
        # Hai request trùng SĐT/Email gửi cùng lúc vượt qua bước kiểm tra phía trên
        db.rollback()
        raise HTTPException(status_code=400, detail="Số điện thoại hoặc Email đã được sử dụng")
    db.refresh(new_user)

    return ResponseBase(message="Cấp tài khoản thành công", data=to_item_out(new_user))

@router.patch("/{phone}", response_model=ResponseBase[AdminUserItemOut], summary="Cập nhật thông tin, vai trò & trạng thái tài khoản")
def update_user(
    phone: str,
    data: AdminUserUpdateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    target_user = db.query(User).filter(User.phone == phone).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")

    if target_user.phone == admin.phone:
        if data.role is not None and data.role != "admin":
            raise HTTPException(status_code=400, detail="Bạn không thể tự hạ quyền Quản trị viên của chính mình")
        if data.status is not None and data.status != "active":
            raise HTTPException(status_code=400, detail="Bạn không thể tự khóa tài khoản của chính mình")

    if data.email and data.email != target_user.email:
        taken = db.query(User).filter(User.email == data.email, User.phone != target_user.phone).first()
        if taken:
            raise HTTPException(status_code=400, detail="Email này đã được sử dụng bởi tài khoản khác")
        target_user.email = data.email

    if data.role is not None:
        target_user.role = data.role
    if data.status is not None:
        target_user.status = data.status
        if data.status == "locked":
            if data.lock_reason:
                target_user.lock_reason = data.lock_reason.strip()
            elif not target_user.lock_reason:
                target_user.lock_reason = "Khóa bởi Quản trị viên"
        else:
            target_user.lock_reason = None
    elif data.lock_reason is not None and target_user.status == "locked":
        target_user.lock_reason = data.lock_reason.strip()

    # Chỉ sửa tại chỗ, không xoá/tạo lại hồ sơ customer để giữ nguyên giỏ hàng & đơn hàng gắn với customer_id
    if target_user.customer:
        if data.first_name is not None:
            target_user.customer.first_name = data.first_name
        if data.last_name is not None:
            target_user.customer.last_name = data.last_name
    else:
        # Tài khoản cũ chưa có hồ sơ (VD: admin seed), customers.first_name/last_name là NOT NULL
        db.add(Customer(
            phone=target_user.phone,
            first_name=data.first_name or "Quản trị",
            last_name=data.last_name or "Viên",
        ))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email này đã được sử dụng bởi tài khoản khác")
    db.refresh(target_user)

    return ResponseBase(message="Cập nhật tài khoản thành công", data=to_item_out(target_user))

@router.patch("/{phone}/status", response_model=ResponseBase[AdminUserItemOut], summary="Khóa / Mở khóa tài khoản người dùng")
def toggle_user_status(
    phone: str,
    data: Optional[UserStatusUpdateIn] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if phone == admin.phone:
        raise HTTPException(status_code=400, detail="Bạn không thể tự khóa tài khoản của chính mình")

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if user.status == "active":
        user.status = "locked"
        reason = data.reason.strip() if (data and data.reason and data.reason.strip()) else "Khóa bởi Quản trị viên"
        user.lock_reason = reason
        msg = f"Đã tạm khóa tài khoản (Lý do: {user.lock_reason})"
    else:
        user.status = "active"
        user.lock_reason = None
        msg = "Đã mở khóa tài khoản thành công"

    db.commit()
    db.refresh(user)
    return ResponseBase(message=msg, data=to_item_out(user))

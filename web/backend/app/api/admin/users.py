from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from thesweets_common.models.user import User
from app.schemas.admin.user import AdminUserItemOut, AdminUserCreateIn, AdminUserUpdateIn, UserStatusUpdateIn
from app.schemas.common import ResponseBase
from app.services.admin.user_service import AdminUserService

router = APIRouter()

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
    users = AdminUserService.list_users(db, role)
    return ResponseBase(data=[to_item_out(u) for u in users])

@router.post("", response_model=ResponseBase[AdminUserItemOut], status_code=status.HTTP_201_CREATED, summary="Cấp tài khoản mới")
def create_user(
    data: AdminUserCreateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    new_user = AdminUserService.create_user(db, data)
    return ResponseBase(message="Cấp tài khoản thành công", data=to_item_out(new_user))

@router.patch("/{phone}", response_model=ResponseBase[AdminUserItemOut], summary="Cập nhật thông tin, vai trò & trạng thái tài khoản")
def update_user(
    phone: str,
    data: AdminUserUpdateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    target_user = AdminUserService.update_user(db, admin, phone, data)
    return ResponseBase(message="Cập nhật tài khoản thành công", data=to_item_out(target_user))

@router.patch("/{phone}/status", response_model=ResponseBase[AdminUserItemOut], summary="Khóa / Mở khóa tài khoản người dùng")
def toggle_user_status(
    phone: str,
    data: Optional[UserStatusUpdateIn] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user, msg = AdminUserService.toggle_status(db, admin, phone, data.reason if data else None)
    return ResponseBase(message=msg, data=to_item_out(user))

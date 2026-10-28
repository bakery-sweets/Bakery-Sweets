from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_staff
from thesweets_common.models.user import User
from app.schemas.admin.auth import AdminLoginRequest, AdminTokenResponse, AdminProfileOut
from app.schemas.common import ResponseBase
from app.services.auth_service import AuthService

router = APIRouter()

@router.post("/login", response_model=AdminTokenResponse, summary="Đăng nhập tài khoản Quản trị viên")
def admin_login(data: AdminLoginRequest, db: Session = Depends(get_db)):
    user, token = AuthService.login_backoffice(db, data.username, data.password)
    return AdminTokenResponse(
        access_token=token,
        role=user.role,
        phone=user.phone,
        email=user.email,
    )

@router.get("/me", response_model=ResponseBase[AdminProfileOut], summary="Lấy hồ sơ Admin đang đăng nhập")
def get_admin_profile(current_admin: User = Depends(get_current_staff)):
    profile = AdminProfileOut(
        phone=current_admin.phone,
        email=current_admin.email,
        role=current_admin.role,
        status=current_admin.status,
    )
    return ResponseBase(data=profile)

@router.post("/logout", summary="Đăng xuất quản trị")
def admin_logout():
    return ResponseBase(message="Đăng xuất thành công")

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.core.security import verify_password, create_access_token
from app.models.user import User
from app.schemas.admin.auth import AdminLoginRequest, AdminTokenResponse, AdminProfileOut
from app.schemas.common import ResponseBase

router = APIRouter()

@router.post("/login", response_model=AdminTokenResponse, summary="Đăng nhập tài khoản Quản trị viên")
def admin_login(data: AdminLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(or_(User.phone == data.username, User.email == data.username)).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản hoặc mật khẩu quản trị không chính xác",
        )

    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản không có quyền truy cập hệ thống Quản trị",
        )

    if user.status == "locked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản quản trị này đã bị khóa",
        )

    token = create_access_token({"sub": user.phone, "role": user.role})
    return AdminTokenResponse(
        access_token=token,
        role=user.role,
        phone=user.phone,
        email=user.email,
    )

@router.get("/me", response_model=ResponseBase[AdminProfileOut], summary="Lấy hồ sơ Admin đang đăng nhập")
def get_admin_profile(current_admin: User = Depends(get_current_admin)):
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

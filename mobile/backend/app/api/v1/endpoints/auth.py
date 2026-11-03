from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from thesweets_common.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserProfileOut, UpdateProfileRequest
from app.services.auth_service import AuthService
from app.services.realtime_service import RealtimeService

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = AuthService.authenticate(db, req.user_name, req.password)
    return AuthService.issue_token(user)

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    new_user = AuthService.register(db, req)
    return AuthService.issue_token(new_user)

@router.get("/me", response_model=UserProfileOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return AuthService.build_profile(current_user)

@router.put("/profile", response_model=UserProfileOut)
@router.put("/me", response_model=UserProfileOut)
def update_profile(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    old_phone = current_user.phone
    user = AuthService.update_profile(db, current_user, req)
    # Báo các thiết bị khác của tài khoản (Web / App khác) tải lại thông tin cá nhân
    for phone in {old_phone, user.phone}:
        RealtimeService.to_user(phone, "profile_updated")
    return AuthService.build_profile(user)

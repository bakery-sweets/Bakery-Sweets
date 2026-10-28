from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from thesweets_common.models.user import User
from app.schemas.client.auth import (
    ClientRegisterRequest,
    ClientLoginRequest,
    ClientTokenResponse,
    ClientProfileOut,
)
from app.schemas.common import ResponseBase
from app.services.auth_service import AuthService

router = APIRouter()

def to_profile_out(user: User) -> ClientProfileOut:
    cust = user.customer
    return ClientProfileOut(
        phone=user.phone,
        email=user.email,
        first_name=cust.first_name if cust else "",
        last_name=cust.last_name if cust else "",
        role=user.role,
    )

@router.post("/register", response_model=ResponseBase[ClientProfileOut], status_code=status.HTTP_201_CREATED, summary="Đăng ký tài khoản khách hàng")
def register(data: ClientRegisterRequest, db: Session = Depends(get_db)):
    user = AuthService.register_customer(db, data)
    return ResponseBase(message="Đăng ký tài khoản thành công", data=to_profile_out(user))

@router.post("/login", response_model=ClientTokenResponse, summary="Đăng nhập tài khoản khách hàng")
def login(data: ClientLoginRequest, db: Session = Depends(get_db)):
    user, token = AuthService.login_customer(db, data.phone, data.password)
    cust = user.customer
    return ClientTokenResponse(
        access_token=token,
        phone=user.phone,
        email=user.email,
        role=user.role,
        first_name=cust.first_name if cust else None,
        last_name=cust.last_name if cust else None,
    )

@router.get("/me", response_model=ResponseBase[ClientProfileOut], summary="Xem thông tin cá nhân khách hàng")
def get_me(current_user: User = Depends(get_current_user)):
    return ResponseBase(data=to_profile_out(current_user))

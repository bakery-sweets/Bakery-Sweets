from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User, Customer
from app.schemas.client.auth import (
    ClientRegisterRequest,
    ClientLoginRequest,
    ClientTokenResponse,
    ClientProfileOut,
)
from app.schemas.common import ResponseBase

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
    existing_user = db.query(User).filter(User.phone == data.phone).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Số điện thoại đã được đăng ký")

    existing_email = db.query(User).filter(User.email == data.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email này đã được sử dụng")

    hashed_pw = get_password_hash(data.password)
    user = User(
        phone=data.phone,
        email=data.email,
        password=hashed_pw,
        role="customer",
        status="active",
    )
    db.add(user)
    db.flush()

    customer = Customer(
        phone=user.phone,
        first_name=data.first_name,
        last_name=data.last_name,
    )
    db.add(customer)
    db.commit()
    db.refresh(user)

    return ResponseBase(message="Đăng ký tài khoản thành công", data=to_profile_out(user))

@router.post("/login", response_model=ClientTokenResponse, summary="Đăng nhập tài khoản khách hàng")
def login(data: ClientLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == data.phone).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=400, detail="Số điện thoại hoặc mật khẩu không chính xác")

    if user.status == "locked":
        raise HTTPException(status_code=403, detail="Tài khoản của bạn đã bị khóa")

    token = create_access_token({"sub": user.phone, "role": user.role})
    return ClientTokenResponse(
        access_token=token,
        phone=user.phone,
        email=user.email,
        role=user.role,
    )

@router.get("/me", response_model=ResponseBase[ClientProfileOut], summary="Xem thông tin cá nhân khách hàng")
def get_me(current_user: User = Depends(get_current_user)):
    return ResponseBase(data=to_profile_out(current_user))

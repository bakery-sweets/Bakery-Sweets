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

@router.post("/register", response_model=ResponseBase[ClientProfileOut], status_code=status.HTTP_201_CREATED, summary="Đăng ký tài khoản khách hàng")
def register(data: ClientRegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.user_name == data.user_name).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại")

    existing_email = db.query(User).filter(User.email == data.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email này đã được sử dụng")

    hashed_pw = get_password_hash(data.password)
    user = User(
        user_name=data.user_name,
        email=data.email,
        password=hashed_pw,
        role="customer",
        status="active",
    )
    db.add(user)
    db.flush()

    customer = Customer(
        user_name=user.user_name,
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        gender=data.gender or "Other",
        loyalty_points=0,
    )
    db.add(customer)
    db.commit()
    db.refresh(user)

    profile = ClientProfileOut(
        user_name=user.user_name,
        email=user.email,
        first_name=customer.first_name,
        last_name=customer.last_name,
        phone=customer.phone,
        gender=customer.gender,
        loyalty_points=customer.loyalty_points,
    )
    return ResponseBase(message="Đăng ký tài khoản thành công", data=profile)

@router.post("/login", response_model=ClientTokenResponse, summary="Đăng nhập tài khoản khách hàng")
def login(data: ClientLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_name == data.username).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=400, detail="Tên đăng nhập hoặc mật khẩu không chính xác")

    if user.status == "locked":
        raise HTTPException(status_code=403, detail="Tài khoản của bạn đã bị khóa")

    token = create_access_token({"sub": user.user_name, "role": user.role})
    return ClientTokenResponse(
        access_token=token,
        user_name=user.user_name,
        email=user.email,
        role=user.role,
    )

@router.get("/me", response_model=ResponseBase[ClientProfileOut], summary="Xem thông tin cá nhân khách hàng")
def get_me(current_user: User = Depends(get_current_user)):
    fn, ln, ph, gd, pts = "", "", None, None, 0
    if current_user.customer:
        fn = current_user.customer.first_name
        ln = current_user.customer.last_name
        ph = current_user.customer.phone
        gd = current_user.customer.gender
        pts = current_user.customer.loyalty_points

    profile = ClientProfileOut(
        user_name=current_user.user_name,
        email=current_user.email,
        first_name=fn,
        last_name=ln,
        phone=ph,
        gender=gd,
        loyalty_points=pts,
    )
    return ResponseBase(data=profile)

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.guest_account import WALK_IN_PHONE, GUEST_EMAIL_DOMAIN, GUEST_LOGIN_HINT, is_guest_account
from thesweets_common.models.user import User, Customer
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
if data.phone == WALK_IN_PHONE:
        raise HTTPException(status_code=400, detail="Số điện thoại không hợp lệ")
    # Đuôi email dành riêng cho tài khoản ẩn do nhân viên tạo
    if data.email.lower().endswith(f"@{GUEST_EMAIL_DOMAIN}"):
        raise HTTPException(status_code=400, detail="Email không hợp lệ")

    existing_user = db.query(User).filter(User.phone == data.phone).first()
    if existing_user and not is_guest_account(existing_user):
        raise HTTPException(status_code=400, detail="Số điện thoại đã được đăng ký")

    existing_email = db.query(User).filter(User.email == data.email, User.phone != data.phone).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email này đã được sử dụng")

    hashed_pw = get_password_hash(data.password)

    if existing_user:
        # SĐT đã có tài khoản ẩn do nhân viên tạo khi khách gọi điện / mua tại quầy:
        # chuyển thành tài khoản thật của khách, giữ nguyên lịch sử đơn hàng
        if existing_user.status == "locked":
            raise HTTPException(
                status_code=403,
                detail="Số điện thoại này đang bị khóa, vui lòng liên hệ cửa hàng để được hỗ trợ",
            )
        existing_user.email = data.email
        existing_user.password = hashed_pw
        existing_user.role = "customer"
        cust = existing_user.customer
        if cust:
            cust.first_name = data.first_name
            cust.last_name = data.last_name
        else:
            db.add(Customer(phone=existing_user.phone, first_name=data.first_name, last_name=data.last_name))
        db.commit()
        db.refresh(existing_user)
        order_count = len(existing_user.customer.orders) if existing_user.customer else 0
        message = "Đăng ký tài khoản thành công"
        if order_count:
            message += f". {order_count} đơn hàng bạn đã đặt tại cửa hàng bằng số điện thoại này đã có trong tài khoản"
        return ResponseBase(message=message, data=to_profile_out(existing_user))
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
user = db.query(User).filter(User.phone == data.phone.strip()).first()
    if user and is_guest_account(user) and user.phone != WALK_IN_PHONE:
        # Tài khoản ẩn do nhân viên tạo: chưa có mật khẩu của khách, hướng dẫn khách đăng ký để nhận tài khoản
        raise HTTPException(status_code=400, detail=GUEST_LOGIN_HINT)
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=400, detail="Số điện thoại hoặc mật khẩu không chính xác")

    if user.status == "locked":
        raise HTTPException(status_code=403, detail="Tài khoản của bạn đã bị khóa")

    token = create_access_token({"sub": user.phone, "role": user.role})

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

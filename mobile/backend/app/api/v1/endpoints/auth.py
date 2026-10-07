from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.models.user import User, Customer
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserProfileOut
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter()

def _build_profile_out(user: User) -> UserProfileOut:
    customer = user.customer
    return UserProfileOut(
        user_name=user.user_name,
        email=user.email,
        role=user.role,
        status=user.status,
        customer_id=customer.customer_id if customer else None,
        first_name=customer.first_name if customer else None,
        last_name=customer.last_name if customer else None,
        phone=customer.phone if customer else None,
        gender=customer.gender if customer else None,
        loyalty_points=customer.loyalty_points if customer else 0,
    )

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.user_name == req.user_name) | (User.email == req.user_name)
    ).first()

    if not user or not verify_password(req.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác",
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn đã bị khóa",
        )

    token = create_access_token(data={"sub": user.user_name, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=_build_profile_out(user),
    )

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.user_name == req.user_name).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập này đã được sử dụng",
        )

    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được sử dụng",
        )

    if req.phone and db.query(Customer).filter(Customer.phone == req.phone).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Số điện thoại này đã được sử dụng",
        )

    try:
        new_user = User(
            user_name=req.user_name,
            email=req.email,
            password=get_password_hash(req.password),
            role="customer",
            status="active",
        )
        db.add(new_user)
        db.flush()

        new_customer = Customer(
            user_name=new_user.user_name,
            first_name=req.first_name,
            last_name=req.last_name,
            phone=req.phone,
            gender=req.gender or "Other",
            loyalty_points=0,
        )
        db.add(new_customer)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi tạo tài khoản: {str(e)}",
        )

    token = create_access_token(data={"sub": new_user.user_name, "role": new_user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=_build_profile_out(new_user),
    )

@router.get("/me", response_model=UserProfileOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return _build_profile_out(current_user)

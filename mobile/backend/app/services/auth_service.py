import re
from typing import Optional
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, BadRequestError, ForbiddenError, UnauthorizedError
from thesweets_common.models.user import User, Customer
from app.schemas.auth import RegisterRequest, TokenResponse, UserProfileOut, UpdateProfileRequest
from app.core.security import verify_password, get_password_hash, create_access_token

STAFF_ROLES = ("admin", "staff")

# Tài khoản ẩn do nhân viên tạo khi khách đặt bánh qua điện thoại / tại quầy mà chưa có tài khoản
# (bản sao của web/backend/app/core/guest_account.py vì 2 backend dùng chung DB)
GUEST_EMAIL_DOMAIN = "guest.thesweets"
# SĐT dùng chung cho khách lẻ vãng lai: gom đơn của mọi khách lẻ nên không ai được đăng ký / nhận
WALK_IN_PHONE = "0000000000"
GUEST_LOGIN_HINT = (
    "Số điện thoại này đã có đơn đặt tại cửa hàng nhưng chưa có tài khoản. "
    "Vui lòng đăng ký bằng số điện thoại này để đăng nhập và xem lại các đơn hàng."
)


def is_guest_account(user: Optional[User]) -> bool:
    return bool(user and user.email and user.email.endswith(f"@{GUEST_EMAIL_DOMAIN}"))

class AuthService:
    @staticmethod
    def get_user_by_identifier(db: Session, identifier: str) -> Optional[User]:
        """Tìm user theo số điện thoại hoặc email"""
        return db.query(User).filter(
            (User.phone == identifier) | (User.email == identifier)
        ).first()

    @staticmethod
    def build_profile(user: User) -> UserProfileOut:
        customer = user.customer
        return UserProfileOut(
            user_name=user.phone,
            email=user.email,
            role=user.role,
            status=user.status,
            customer_id=customer.customer_id if customer else None,
            first_name=customer.first_name if customer else None,
            last_name=customer.last_name if customer else None,
            phone=user.phone,
            gender="Other",
        )

    @staticmethod
    def issue_token(user: User) -> TokenResponse:
        token = create_access_token(data={"sub": user.phone, "role": user.role})
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=AuthService.build_profile(user),
        )

    @staticmethod
    def authenticate(db: Session, identifier: str, password: str) -> User:
        user = AuthService.get_user_by_identifier(db, identifier.strip())

        if user and is_guest_account(user) and user.phone != WALK_IN_PHONE:
            # Tài khoản ẩn chưa có mật khẩu của khách: hướng dẫn đăng ký để nhận tài khoản
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GUEST_LOGIN_HINT)

        if not user or not verify_password(password, user.password):
            raise UnauthorizedError(
                "Số điện thoại / email hoặc mật khẩu không chính xác",
            )

        if user.status != "active":
            raise ForbiddenError(
                "Tài khoản của bạn đã bị khóa",
            )
        return user

    @staticmethod
    def register(db: Session, req: RegisterRequest) -> User:
        # Bỏ khoảng trắng để "0911 111 111" khớp với hồ sơ nhân viên đã tạo khi khách đặt qua điện thoại
        phone_key = re.sub(r"\s+", "", req.phone or req.user_name or "")
        if not phone_key:
            raise BadRequestError(
                "Vui lòng cung cấp số điện thoại",
            )
        if phone_key == WALK_IN_PHONE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Số điện thoại không hợp lệ",
            )
        # Đuôi email dành riêng cho tài khoản ẩn do nhân viên tạo
        if req.email.strip().lower().endswith(f"@{GUEST_EMAIL_DOMAIN}"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email không hợp lệ",
            )

        existing = db.query(User).filter(User.phone == phone_key).first()
        if existing and not is_guest_account(existing):
            raise BadRequestError(
                "Số điện thoại này đã được sử dụng",
            )

        if db.query(User).filter(User.email == req.email.strip(), User.phone != phone_key).first():
            raise BadRequestError(
                "Email này đã được sử dụng",
            )
            )

        if existing:
            # SĐT đã có tài khoản ẩn (khách từng đặt qua điện thoại / tại quầy):
            # chuyển thành tài khoản thật của khách, giữ nguyên lịch sử đơn hàng
            if existing.status == "locked":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Số điện thoại này đang bị khóa, vui lòng liên hệ cửa hàng để được hỗ trợ",
                )
            existing.email = req.email.strip()
            existing.password = get_password_hash(req.password)
            first_name = req.first_name.strip() if req.first_name else ""
            last_name = req.last_name.strip() if req.last_name else ""
            if existing.customer:
                existing.customer.first_name = first_name
                existing.customer.last_name = last_name
            else:
                db.add(Customer(phone=existing.phone, first_name=first_name, last_name=last_name))
            db.commit()
            db.refresh(existing)
            return existing

        try:
            new_user = User(
                phone=phone_key,
                email=req.email.strip(),
                password=get_password_hash(req.password),
                role="customer",
                status="active",
            )
            db.add(new_user)
            db.flush()

            new_customer = Customer(
                phone=new_user.phone,
                first_name=req.first_name.strip() if req.first_name else "",
                last_name=req.last_name.strip() if req.last_name else "",
            )
            db.add(new_customer)
            db.commit()
            db.refresh(new_user)
        except Exception as e:
            db.rollback()
            raise AppError(
                f"Lỗi tạo tài khoản: {str(e)}",
            )
        return new_user

    @staticmethod
    def update_profile(db: Session, user: User, req: UpdateProfileRequest) -> User:
        if req.email and req.email.strip() != user.email:
            existing_email = db.query(User).filter(
                User.email == req.email.strip(),
                User.phone != user.phone,
            ).first()
            if existing_email:
                raise BadRequestError(
                    "Email này đã được sử dụng bởi tài khoản khác",
                )
            user.email = req.email.strip()

        customer = user.customer
        if not customer:
            customer = Customer(
                phone=user.phone,
                first_name=req.first_name.strip() if req.first_name else "",
                last_name=req.last_name.strip() if req.last_name else "",
            )
            db.add(customer)
        else:
            if req.first_name is not None:
                customer.first_name = req.first_name.strip()
            if req.last_name is not None:
                customer.last_name = req.last_name.strip()

        db.commit()
        db.refresh(user)
        return user

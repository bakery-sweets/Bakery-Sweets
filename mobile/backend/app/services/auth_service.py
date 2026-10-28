from typing import Optional
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, BadRequestError, ForbiddenError, UnauthorizedError
from thesweets_common.models.user import User, Customer
from app.schemas.auth import RegisterRequest, TokenResponse, UserProfileOut, UpdateProfileRequest
from app.core.security import verify_password, get_password_hash, create_access_token

STAFF_ROLES = ("admin", "staff")

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
        phone_key = (req.phone or req.user_name).strip()
        if not phone_key:
            raise BadRequestError(
                "Vui lòng cung cấp số điện thoại",
            )

        if db.query(User).filter(User.phone == phone_key).first():
            raise BadRequestError(
                "Số điện thoại này đã được sử dụng",
            )

        if db.query(User).filter(User.email == req.email.strip()).first():
            raise BadRequestError(
                "Email này đã được sử dụng",
            )

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

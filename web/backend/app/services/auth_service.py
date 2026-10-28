from typing import Optional, Tuple
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.core.exceptions import BadRequestError, ForbiddenError
from app.core.security import verify_password, get_password_hash, create_access_token
from thesweets_common.models.user import User, Customer
from app.schemas.client.auth import ClientRegisterRequest

BACKOFFICE_ROLES = ("admin", "staff")

class AuthService:
    """Xác thực tài khoản dùng chung cho Admin Portal và Storefront"""

    @staticmethod
    def get_user_by_phone(db: Session, phone: str) -> Optional[User]:
        return db.query(User).filter(User.phone == phone).first()

    @staticmethod
    def _issue_token(user: User) -> str:
        return create_access_token({"sub": user.phone, "role": user.role})

    @staticmethod
    def login_backoffice(db: Session, username: str, password: str) -> Tuple[User, str]:
        """Đăng nhập trang Quản trị bằng số điện thoại hoặc email, chỉ dành cho admin / staff"""
        user = db.query(User).filter(or_(User.phone == username, User.email == username)).first()
        if not user or not verify_password(password, user.password):
            raise BadRequestError("Tài khoản hoặc mật khẩu quản trị không chính xác")

        if user.role not in BACKOFFICE_ROLES:
            raise ForbiddenError("Tài khoản không có quyền truy cập hệ thống Quản trị")

        if user.status == "locked":
            raise ForbiddenError("Tài khoản quản trị này đã bị khóa")

        return user, AuthService._issue_token(user)

    @staticmethod
    def login_customer(db: Session, phone: str, password: str) -> Tuple[User, str]:
        user = AuthService.get_user_by_phone(db, phone)
        if not user or not verify_password(password, user.password):
            raise BadRequestError("Số điện thoại hoặc mật khẩu không chính xác")

        if user.status == "locked":
            raise ForbiddenError("Tài khoản của bạn đã bị khóa")

        return user, AuthService._issue_token(user)

    @staticmethod
    def register_customer(db: Session, data: ClientRegisterRequest) -> User:
        if AuthService.get_user_by_phone(db, data.phone):
            raise BadRequestError("Số điện thoại đã được đăng ký")

        if db.query(User).filter(User.email == data.email).first():
            raise BadRequestError("Email này đã được sử dụng")

        user = User(
            phone=data.phone,
            email=data.email,
            password=get_password_hash(data.password),
            role="customer",
            status="active",
        )
        db.add(user)
        db.flush()

        db.add(Customer(
            phone=user.phone,
            first_name=data.first_name,
            last_name=data.last_name,
        ))
        db.commit()
        db.refresh(user)
        return user

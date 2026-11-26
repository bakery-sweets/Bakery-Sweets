import re
from typing import Optional, Tuple
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.core.exceptions import BadRequestError, ForbiddenError
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.guest_account import WALK_IN_PHONE, GUEST_EMAIL_DOMAIN, GUEST_LOGIN_HINT, is_guest_account
from thesweets_common.models.user import User, Customer
from app.schemas.client.auth import ClientRegisterRequest

BACKOFFICE_ROLES = ("admin", "staff")

PHONE_PATTERN = re.compile(r"^0\d{9}$")
PASSWORD_MIN_LENGTH = 6


def validate_register_fields(phone: str, password: str, first_name: str, last_name: str) -> None:
    """Luật đăng ký dùng chung Web & App (trước đây backend nhận cả SĐT "abc", mật khẩu 1 ký tự)."""
    if not PHONE_PATTERN.match(phone or ""):
        raise BadRequestError("Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0")
    if len(password or "") < PASSWORD_MIN_LENGTH:
        raise BadRequestError(f"Mật khẩu phải có ít nhất {PASSWORD_MIN_LENGTH} ký tự")
    if not (first_name or "").strip() or not (last_name or "").strip():
        raise BadRequestError("Vui lòng nhập đầy đủ họ và tên")


def locked_message(user) -> str:
    """Báo khóa kèm lý do admin đã ghi (nếu có)."""
    reason = (getattr(user, "lock_reason", None) or "").strip()
    return f"Tài khoản của bạn đã bị khóa. Lý do: {reason}" if reason else "Tài khoản của bạn đã bị khóa"


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
        user = AuthService.get_user_by_phone(db, phone.strip())
        if user and is_guest_account(user) and user.phone != WALK_IN_PHONE:
            # Tài khoản ẩn do nhân viên tạo (khách đặt qua điện thoại / tại quầy): chưa có mật khẩu của khách
            raise BadRequestError(GUEST_LOGIN_HINT)
        if not user or not verify_password(password, user.password):
            raise BadRequestError("Số điện thoại hoặc mật khẩu không chính xác")

        if user.status == "locked":
            raise ForbiddenError(locked_message(user))

        return user, AuthService._issue_token(user)

    @staticmethod
    def register_customer(db: Session, data: ClientRegisterRequest) -> Tuple[User, int]:
        """
        Đăng ký tài khoản khách. Trả về (user, số đơn cũ đã có sẵn trong tài khoản):
        SĐT từng đặt qua nhân viên (có tài khoản ẩn) thì nhận lại tài khoản đó, giữ nguyên lịch sử đơn.
        """
        validate_register_fields(data.phone, data.password, data.first_name, data.last_name)
        if data.phone == WALK_IN_PHONE:
            raise BadRequestError("Số điện thoại không hợp lệ")
        # Đuôi email dành riêng cho tài khoản ẩn do nhân viên tạo
        if data.email.lower().endswith(f"@{GUEST_EMAIL_DOMAIN}"):
            raise BadRequestError("Email không hợp lệ")

        existing = AuthService.get_user_by_phone(db, data.phone)
        if existing and not is_guest_account(existing):
            raise BadRequestError("Số điện thoại đã được đăng ký")

        if db.query(User).filter(User.email == data.email, User.phone != data.phone).first():
            raise BadRequestError("Email này đã được sử dụng")

        if existing:
            if existing.status == "locked":
                raise ForbiddenError("Số điện thoại này đang bị khóa, vui lòng liên hệ cửa hàng để được hỗ trợ")
            existing.email = data.email
            existing.password = get_password_hash(data.password)
            if existing.customer:
                existing.customer.first_name = data.first_name
                existing.customer.last_name = data.last_name
            else:
                db.add(Customer(phone=existing.phone, first_name=data.first_name, last_name=data.last_name))
            db.commit()
            db.refresh(existing)
            return existing, len(existing.customer.orders) if existing.customer else 0

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
        return user, 0

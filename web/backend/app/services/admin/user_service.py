from typing import List, Optional, Tuple
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.exceptions import BadRequestError, NotFoundError
from app.core.security import get_password_hash
from thesweets_common.models.user import User, Customer
from app.schemas.admin.user import AdminUserCreateIn, AdminUserUpdateIn
from app.services.realtime_service import RealtimeService

DEFAULT_LOCK_REASON = "Khóa bởi Quản trị viên"

class AdminUserService:
    @staticmethod
    def _get_or_404(db: Session, phone: str, message: str) -> User:
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            raise NotFoundError(message)
        return user

    @staticmethod
    def _kick_if_locked(user: User, was_active: bool):
        # Vừa bị khóa: đăng xuất ngay trên mọi thiết bị đang mở App / Web
        if was_active and user.status == "locked":
            RealtimeService.kick_user(user.phone, "account_locked", {"reason": user.lock_reason})

    @staticmethod
    def list_users(db: Session, role: Optional[str] = None) -> List[User]:
        query = db.query(User)
        if role and role != "all":
            query = query.filter(User.role == role)
        return query.order_by(User.created_at.desc()).all()

    @staticmethod
    def create_user(db: Session, data: AdminUserCreateIn) -> User:
        if db.query(User).filter(User.phone == data.phone).first():
            raise BadRequestError("Số điện thoại này đã được đăng ký tài khoản")

        if db.query(User).filter(User.email == data.email).first():
            raise BadRequestError("Email này đã được sử dụng")

        new_user = User(
            phone=data.phone,
            email=data.email,
            password=get_password_hash(data.password),
            role=data.role,
            status="active",
        )
        new_customer = Customer(
            phone=data.phone,
            first_name=data.first_name,
            last_name=data.last_name,
        )
        db.add_all([new_user, new_customer])
        try:
            db.commit()
        except IntegrityError:
            # Hai request trùng SĐT/Email gửi cùng lúc vượt qua bước kiểm tra phía trên
            db.rollback()
            raise BadRequestError("Số điện thoại hoặc Email đã được sử dụng")
        db.refresh(new_user)
        return new_user

    @staticmethod
    def update_user(db: Session, admin: User, phone: str, data: AdminUserUpdateIn) -> User:
        target_user = AdminUserService._get_or_404(db, phone, "Không tìm thấy tài khoản")
        was_active = target_user.status == "active"

        if target_user.phone == admin.phone:
            if data.role is not None and data.role != "admin":
                raise BadRequestError("Bạn không thể tự hạ quyền Quản trị viên của chính mình")
            if data.status is not None and data.status != "active":
                raise BadRequestError("Bạn không thể tự khóa tài khoản của chính mình")

        if data.email and data.email != target_user.email:
            taken = db.query(User).filter(User.email == data.email, User.phone != target_user.phone).first()
            if taken:
                raise BadRequestError("Email này đã được sử dụng bởi tài khoản khác")
            target_user.email = data.email

        if data.role is not None:
            target_user.role = data.role
        if data.status is not None:
            target_user.status = data.status
            if data.status == "locked":
                if data.lock_reason:
                    target_user.lock_reason = data.lock_reason.strip()
                elif not target_user.lock_reason:
                    target_user.lock_reason = DEFAULT_LOCK_REASON
            else:
                target_user.lock_reason = None
        elif data.lock_reason is not None and target_user.status == "locked":
            target_user.lock_reason = data.lock_reason.strip()

        # Chỉ sửa tại chỗ, không xoá/tạo lại hồ sơ customer để giữ nguyên giỏ hàng & đơn hàng gắn với customer_id
        if target_user.customer:
            if data.first_name is not None:
                target_user.customer.first_name = data.first_name
            if data.last_name is not None:
                target_user.customer.last_name = data.last_name
        else:
            # Tài khoản cũ chưa có hồ sơ (VD: admin seed), customers.first_name/last_name là NOT NULL
            db.add(Customer(
                phone=target_user.phone,
                first_name=data.first_name or "Quản trị",
                last_name=data.last_name or "Viên",
            ))

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise BadRequestError("Email này đã được sử dụng bởi tài khoản khác")
        db.refresh(target_user)
        AdminUserService._kick_if_locked(target_user, was_active)
        return target_user

    @staticmethod
    def toggle_status(db: Session, admin: User, phone: str, reason: Optional[str] = None) -> Tuple[User, str]:
        """Khóa tài khoản đang hoạt động / mở khóa tài khoản đang bị khóa; trả về (user, thông báo)"""
        if phone == admin.phone:
            raise BadRequestError("Bạn không thể tự khóa tài khoản của chính mình")

        user = AdminUserService._get_or_404(db, phone, "Không tìm thấy người dùng")

        was_active = user.status == "active"
        if was_active:
            user.status = "locked"
            user.lock_reason = reason.strip() if (reason and reason.strip()) else DEFAULT_LOCK_REASON
            msg = f"Đã tạm khóa tài khoản (Lý do: {user.lock_reason})"
        else:
            user.status = "active"
            user.lock_reason = None
            msg = "Đã mở khóa tài khoản thành công"

        db.commit()
        db.refresh(user)
        AdminUserService._kick_if_locked(user, was_active)
        return user, msg

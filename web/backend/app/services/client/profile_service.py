from sqlalchemy.orm import Session
from app.core.exceptions import BadRequestError
from app.core.security import verify_password, get_password_hash
from thesweets_common.models.user import User
from app.schemas.client.profile import ProfileUpdateRequest, ChangePasswordRequest

class ClientProfileService:
    @staticmethod
    def update_profile(db: Session, user: User, data: ProfileUpdateRequest) -> User:
        if not user.customer:
            raise BadRequestError("Tài khoản chưa có hồ sơ khách hàng")

        cust = user.customer
        if data.first_name is not None:
            cust.first_name = data.first_name.strip()
        if data.last_name is not None:
            cust.last_name = data.last_name.strip()
        if data.email is not None and data.email != user.email:
            existing = db.query(User).filter(User.email == data.email, User.phone != user.phone).first()
            if existing:
                raise BadRequestError("Email này đã được sử dụng bởi tài khoản khác")
            user.email = data.email

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def change_password(db: Session, user: User, data: ChangePasswordRequest) -> None:
        if not verify_password(data.old_password, user.password):
            raise BadRequestError("Mật khẩu cũ không chính xác")

        if data.old_password == data.new_password:
            raise BadRequestError("Mật khẩu mới phải khác mật khẩu cũ")

        user.password = get_password_hash(data.new_password)
        db.commit()

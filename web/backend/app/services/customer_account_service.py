"""
Hồ sơ khách hàng theo số điện thoại, dùng chung cho đơn tại quầy (POS) và khách đặt online không đăng nhập.

SĐT chưa có tài khoản -> tạo tài khoản ẩn (xem app/core/guest_account.py); khách tự đăng ký bằng đúng SĐT
đó sau này sẽ nhận lại tài khoản kèm các đơn đã đặt.
"""
import secrets
from typing import Tuple
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.exceptions import BadRequestError
from app.core.security import get_password_hash
from app.core.guest_account import WALK_IN_PHONE, guest_email, is_guest_account
from thesweets_common.models.user import User, Customer


def split_full_name(full_name: str) -> Tuple[str, str]:
    """Tách "Nguyễn Văn An" thành (first_name="Nguyễn", last_name="Văn An") theo quy ước của dự án."""
    parts = full_name.split()
    if len(parts) < 2:
        return "", full_name.strip()
    return parts[0], " ".join(parts[1:])


def get_or_create_customer(db: Session, phone: str, full_name: str) -> Tuple[Customer, bool]:
    """
    Lấy hồ sơ khách theo SĐT, chưa có thì tạo mới.
    Trả về (customer, has_real_account): has_real_account = khách tự đăng ký tài khoản (không phải tài khoản tại quầy).
    """
    customer = db.query(Customer).filter(Customer.phone == phone).first()
    if customer:
        return customer, not is_guest_account(customer.user)
    if phone == WALK_IN_PHONE:
        full_name = "Khách vãng lai"

    first_name, last_name = split_full_name(full_name)
    user = db.query(User).filter(User.phone == phone).first()
    has_real_account = user is not None and not is_guest_account(user)
    try:
        # Savepoint: 2 quầy cùng tạo khách cho 1 SĐT mới thì bên chậm hơn lấy lại bản ghi vừa được tạo
        with db.begin_nested():
            if not user:
                user = User(
                    phone=phone,
                    email=guest_email(phone),
                    # Mật khẩu ngẫu nhiên không ai biết: tài khoản chỉ dùng để gắn đơn hàng
                    password=get_password_hash(secrets.token_urlsafe(24)),
                    role="customer",
                    status="active",
                )
                db.add(user)
                db.flush()
            # SĐT đã có tài khoản (VD: nhân viên) nhưng chưa có hồ sơ khách: chỉ bổ sung hồ sơ
            customer = Customer(phone=phone, first_name=first_name, last_name=last_name)
            db.add(customer)
            db.flush()
    except IntegrityError:
        customer = db.query(Customer).filter(Customer.phone == phone).first()
        if not customer:
            raise BadRequestError("Không tạo được hồ sơ khách hàng, vui lòng thử lại")
        return customer, not is_guest_account(customer.user)
    return customer, has_real_account

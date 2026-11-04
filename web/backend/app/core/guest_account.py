"""
Tài khoản ẩn của khách đặt bánh qua nhân viên (gọi điện / tại quầy) khi khách chưa có tài khoản.

- Nhân viên tạo đơn cho SĐT mới -> hệ thống tạo User + Customer với email giả "<SĐT>@guest.thesweets"
  và mật khẩu ngẫu nhiên (không ai đăng nhập được).
- Sau đó khách tự đăng ký bằng đúng SĐT đó -> tài khoản ẩn được chuyển thành tài khoản thật,
  giữ nguyên các đơn đã đặt.

Mobile Backend dùng chung DB nên có bản sao các hằng số này (mobile/backend/app/services/auth_service.py).
"""
from typing import Optional
from thesweets_common.models.user import User

GUEST_EMAIL_DOMAIN = "guest.thesweets"

# SĐT dùng chung cho khách lẻ vãng lai (bán tại quầy). Không ai được đăng ký / nhận tài khoản này
# vì nó gom đơn của mọi khách lẻ. Không dùng 0900000000 vì đó là SĐT tài khoản admin trong dữ liệu mẫu.
WALK_IN_PHONE = "0000000000"

GUEST_LOGIN_HINT = (
    "Số điện thoại này đã có đơn đặt tại cửa hàng nhưng chưa có tài khoản. "
    "Vui lòng đăng ký bằng số điện thoại này để đăng nhập và xem lại các đơn hàng."
)


def guest_email(phone: str) -> str:
    return f"{phone}@{GUEST_EMAIL_DOMAIN}"


def is_guest_account(user: Optional[User]) -> bool:
    return bool(user and user.email and user.email.endswith(f"@{GUEST_EMAIL_DOMAIN}"))

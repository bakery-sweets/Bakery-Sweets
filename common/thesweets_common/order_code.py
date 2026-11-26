"""Mã đơn hàng dùng chung cho Web (khách đặt, tại quầy) và App: "DH" + 6 ký tự hex in hoa, VD DH3EA86D."""
import secrets

from sqlalchemy.orm import Session

from thesweets_common.models.order import Order


def generate_order_code(db: Session) -> str:
    """Sinh mã chưa có trong DB (16,7 triệu tổ hợp; ràng buộc UNIQUE của cột vẫn chặn trường hợp hiếm 2 đơn trùng cùng lúc)."""
    for _ in range(20):
        code = f"DH{secrets.token_hex(3).upper()}"
        if not db.query(Order.order_id).filter(Order.order_code == code).first():
            return code
    return f"DH{secrets.token_hex(5).upper()}"

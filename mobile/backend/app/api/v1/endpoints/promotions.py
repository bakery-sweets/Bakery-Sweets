from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from app.config.database import get_db
from app.models.promotion import Promotion, InvoicePromotion
from app.models.order import Order
from app.models.user import User
from app.schemas.promotion import PromotionOut, InvoicePromotionOut
from app.core.security import get_optional_current_user

router = APIRouter()

@router.get("/promotions", response_model=List[PromotionOut])
def get_promotions(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Lấy danh sách tất cả mã khuyến mãi (voucher) đang hoạt động.
    Nếu người dùng đã đăng nhập, tự động tính toán số lần đã dùng và cờ `is_used` cho từng voucher.
    """
    now = datetime.now()
    promos = (
        db.query(Promotion)
        .options(joinedload(Promotion.invoice_promotions))
        .filter(
            Promotion.status == "Active",
            Promotion.end_date >= now,
        )
        .order_by(Promotion.created_at.desc())
        .all()
    )

    # Đếm số lần khách hàng hiện tại đã dùng từng mã voucher (chỉ tính đơn hợp lệ, không tính Cancelled)
    user_usage_counts = {}
    if current_user and current_user.customer:
        customer_id = current_user.customer.customer_id
        usage_records = (
            db.query(Order.promotion_id, func.count(Order.order_id))
            .filter(
                Order.customer_id == customer_id,
                Order.promotion_id.isnot(None),
                Order.status != "Cancelled",
            )
            .group_by(Order.promotion_id)
            .all()
        )
        user_usage_counts = {p_id: count for p_id, count in usage_records}

    result = []
    for p in promos:
        inv_list = []
        best_min_val = Decimal("0.0")
        best_discount_pct = Decimal("0.0")
        best_max_discount = None

        if p.invoice_promotions:
            sorted_inv = sorted(p.invoice_promotions, key=lambda x: x.min_order_value)
            for inv in sorted_inv:
                inv_list.append(InvoicePromotionOut(
                    min_order_value=inv.min_order_value,
                    discount_percentage=inv.discount_percentage,
                    max_discount_value=inv.max_discount_value,
                ))
            first_inv = sorted_inv[0]
            best_min_val = first_inv.min_order_value
            best_discount_pct = first_inv.discount_percentage
            best_max_discount = first_inv.max_discount_value

        # Kiểm tra giới hạn lượt dùng của tài khoản
        used_times = user_usage_counts.get(p.promotion_id, 0)
        limit_per_user = p.usage_limit_per_user if p.usage_limit_per_user is not None else 1
        is_used = used_times >= limit_per_user
        can_use = not is_used

        result.append(PromotionOut(
            promotion_id=p.promotion_id,
            promotion_code=p.promotion_code,
            promotion_name=p.promotion_name,
            description=p.description,
            start_date=p.start_date,
            end_date=p.end_date,
            status=p.status,
            usage_limit_per_user=p.usage_limit_per_user,
            total_usage_limit=p.total_usage_limit,
            used_by_current_user=used_times,
            is_used=is_used,
            can_use=can_use,
            min_order_value=best_min_val,
            discount_percentage=best_discount_pct,
            max_discount_value=best_max_discount,
            invoice_promotions=inv_list,
        ))

    return result

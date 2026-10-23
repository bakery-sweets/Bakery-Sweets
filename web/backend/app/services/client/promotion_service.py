from typing import List, Optional, Tuple
from datetime import datetime
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.models.promotion import Promotion, InvoicePromotion, OrderPromotion
from app.models.order import Order
from app.models.user import User
from app.schemas.client.promotion import PromotionOut, InvoicePromotionOut

class ClientPromotionService:
    @staticmethod
    def get_promotions(db: Session, current_user: Optional[User] = None) -> List[PromotionOut]:
        now = datetime.now()
        promos = (
            db.query(Promotion)
            .options(joinedload(Promotion.invoice_promotions))
            .filter(
                Promotion.status == "Active",
                Promotion.start_date <= now,
                Promotion.end_date >= now,
            )
            .order_by(Promotion.created_at.desc())
            .all()
        )

        # Tổng lượt dùng toàn hệ thống, cùng cách đếm với calculate_discount
        total_usage_counts = dict(
            db.query(Order.promotion_id, func.count(Order.order_id))
            .filter(Order.promotion_id.isnot(None), Order.status != "Cancelled")
            .group_by(Order.promotion_id)
            .all()
        )

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
            best_min_val = Decimal("0.00")
            best_discount_pct = Decimal("0.00")
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

            used_times = user_usage_counts.get(p.promotion_id, 0)
            limit_per_user = p.usage_limit_per_user if p.usage_limit_per_user is not None else 1
            is_used = used_times >= limit_per_user
            can_use = not is_used

            # Chỉ trả về mã khách còn dùng được: bỏ mã khách đã dùng hết lượt và mã đã hết lượt toàn hệ thống
            sold_out = p.total_usage_limit is not None and total_usage_counts.get(p.promotion_id, 0) >= p.total_usage_limit
            if is_used or sold_out:
                continue

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

    @staticmethod
    def calculate_discount(
        db: Session,
        code: str,
        total_amount: Decimal,
        customer_id: Optional[int] = None,
    ) -> Tuple[Promotion, Decimal]:
        """
        Xác thực mã voucher và tính số tiền giảm giá.
        Trả về (Promotion, discount_amount).
        """
        now = datetime.now()
        promo = (
            db.query(Promotion)
            .options(joinedload(Promotion.invoice_promotions))
            .filter(
                func.upper(Promotion.promotion_code) == code.strip().upper(),
                Promotion.status == "Active",
            )
            .first()
        )

        if not promo:
            raise HTTPException(status_code=400, detail="Mã khuyến mãi không tồn tại hoặc đã hết hiệu lực")

        if promo.start_date > now:
            raise HTTPException(status_code=400, detail="Chương trình khuyến mãi chưa bắt đầu")

        if promo.end_date < now:
            raise HTTPException(status_code=400, detail="Chương trình khuyến mãi đã kết thúc")

        # Kiểm tra tổng lượt dùng toàn hệ thống nếu có cấu hình
        if promo.total_usage_limit is not None:
            total_used = (
                db.query(func.count(Order.order_id))
                .filter(Order.promotion_id == promo.promotion_id, Order.status != "Cancelled")
                .scalar()
            ) or 0
            if total_used >= promo.total_usage_limit:
                raise HTTPException(status_code=400, detail="Mã khuyến mãi đã hết lượt sử dụng trên hệ thống")

        # Kiểm tra số lượt dùng của khách hàng
        if customer_id and promo.usage_limit_per_user is not None:
            user_used = (
                db.query(func.count(Order.order_id))
                .filter(
                    Order.customer_id == customer_id,
                    Order.promotion_id == promo.promotion_id,
                    Order.status != "Cancelled",
                )
                .scalar()
            ) or 0
            if user_used >= promo.usage_limit_per_user:
                raise HTTPException(
                    status_code=400,
                    detail=f"Bạn đã sử dụng tối đa ({promo.usage_limit_per_user} lần) cho mã khuyến mãi này",
                )

        # Tính toán mức giảm theo các bậc hóa đơn trong invoice_promotions
        discount_amount = Decimal("0.00")
        if promo.invoice_promotions:
            # Lọc các bậc mà đơn hàng đạt mức tối thiểu, lấy bậc có min_order_value cao nhất
            applicable = [
                inv for inv in promo.invoice_promotions
                if total_amount >= inv.min_order_value
            ]
            if not applicable:
                min_req = min(inv.min_order_value for inv in promo.invoice_promotions)
                raise HTTPException(
                    status_code=400,
                    detail=f"Đơn hàng chưa đạt mức tối thiểu {min_req:,.0f}đ để áp dụng mã này",
                )

            # Lấy bậc có min_order_value lớn nhất
            best_tier = max(applicable, key=lambda x: x.min_order_value)
            raw_discount = (total_amount * best_tier.discount_percentage) / Decimal("100")
            if best_tier.max_discount_value is not None and best_tier.max_discount_value > 0:
                discount_amount = min(raw_discount, best_tier.max_discount_value)
            else:
                discount_amount = raw_discount

        # Không vượt quá tổng tiền hóa đơn
        discount_amount = min(discount_amount, total_amount)
        # Làm tròn 2 chữ số thập phân
        discount_amount = discount_amount.quantize(Decimal("1.00"))

        return promo, discount_amount

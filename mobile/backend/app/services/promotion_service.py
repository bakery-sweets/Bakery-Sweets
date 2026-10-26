from typing import Dict, List, Optional
from datetime import datetime
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.promotion import Promotion, InvoicePromotion
from app.models.order import Order
from app.schemas.promotion import PromotionOut, InvoicePromotionOut

class PromotionService:
    @staticmethod
    def _get_usage_counts(db: Session, customer_id: Optional[int] = None) -> Dict[int, int]:
        """
        Đếm số lần đã dùng từng mã voucher (chỉ tính đơn hợp lệ, không tính Cancelled):
        của một khách hàng nếu có customer_id, không thì tổng lượt dùng toàn hệ thống
        """
        query = db.query(Order.promotion_id, func.count(Order.order_id)).filter(
            Order.promotion_id.isnot(None),
            Order.status != "Cancelled",
        )
        if customer_id is not None:
            query = query.filter(Order.customer_id == customer_id)
        return {p_id: count for p_id, count in query.group_by(Order.promotion_id).all()}

    @staticmethod
    def get_active_promotions(db: Session, customer_id: Optional[int] = None) -> List[PromotionOut]:
        """
        Lấy danh sách mã khuyến mãi đang hoạt động.
        Chỉ trả về mã khách còn dùng được (cùng luật với Web): bỏ mã khách đã dùng hết lượt
        và mã đã hết lượt toàn hệ thống.
        """
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

        user_usage_counts = PromotionService._get_usage_counts(db, customer_id) if customer_id else {}
        total_usage_counts = PromotionService._get_usage_counts(db)

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
            # Hết lượt toàn hệ thống thì không dùng được nữa (cùng luật với Web)
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
                can_use=not is_used and not sold_out,
                min_order_value=best_min_val,
                discount_percentage=best_discount_pct,
                max_discount_value=best_max_discount,
                invoice_promotions=inv_list,
            ))

        return result

    @staticmethod
    def calculate_discount(db: Session, promotion_id: int, customer_id: int, total_cost: Decimal) -> Decimal:
        """Kiểm tra voucher có áp dụng được cho đơn hàng không và trả về số tiền được giảm"""
        promo = db.query(Promotion).filter(Promotion.promotion_id == promotion_id).first()
        if not promo or promo.status != "Active":
            raise HTTPException(status_code=400, detail="Mã ưu đãi không hợp lệ hoặc đã hết hạn")

        now = datetime.now()
        if promo.start_date and promo.start_date > now:
            raise HTTPException(status_code=400, detail="Chương trình ưu đãi chưa bắt đầu")
        if promo.end_date and promo.end_date < now:
            raise HTTPException(status_code=400, detail="Chương trình ưu đãi đã kết thúc")

        # Kiểm tra giới hạn số lần sử dụng cho mỗi tài khoản
        limit_per_user = promo.usage_limit_per_user if promo.usage_limit_per_user is not None else 1
        user_used_count = db.query(Order).filter(
            Order.customer_id == customer_id,
            Order.promotion_id == promotion_id,
            Order.status != "Cancelled"
        ).count()
        if user_used_count >= limit_per_user:
            raise HTTPException(
                status_code=400,
                detail=f"Bạn đã sử dụng mã ưu đãi này rồi. Mỗi tài khoản chỉ được áp dụng tối đa {limit_per_user} lần!"
            )

        # Kiểm tra tổng số lượt sử dụng toàn hệ thống (nếu có giới hạn)
        if promo.total_usage_limit is not None and promo.total_usage_limit > 0:
            total_used_count = db.query(Order).filter(
                Order.promotion_id == promotion_id,
                Order.status != "Cancelled"
            ).count()
            if total_used_count >= promo.total_usage_limit:
                raise HTTPException(
                    status_code=400,
                    detail="Mã ưu đãi này đã hết lượt sử dụng trên hệ thống!"
                )

        inv_promo = db.query(InvoicePromotion).filter(
            InvoicePromotion.promotion_id == promotion_id,
            InvoicePromotion.min_order_value <= total_cost
        ).order_by(InvoicePromotion.min_order_value.desc()).first()

        if not inv_promo:
            raise HTTPException(
                status_code=400,
                detail="Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã ưu đãi này"
            )

        calculated_discount = total_cost * (inv_promo.discount_percentage / Decimal("100.0"))
        if inv_promo.max_discount_value and calculated_discount > inv_promo.max_discount_value:
            return inv_promo.max_discount_value
        return calculated_discount

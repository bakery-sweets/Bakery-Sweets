from typing import Dict, List, Optional
from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.order import Order
from app.models.promotion import Promotion, InvoicePromotion
from app.schemas.admin.promotion import PromotionInput

# Voucher không có chức năng xóa: voucher gắn với hóa đơn (orders.promotion_id, order_promotions),
# muốn ngừng áp dụng thì chuyển sang Tạm dừng / Hết hạn
class AdminPromotionService:
    @staticmethod
    def get_all(db: Session) -> List[Promotion]:
        return db.query(Promotion).order_by(Promotion.promotion_id.desc()).all()

    @staticmethod
    def get_by_id(db: Session, promotion_id: int) -> Optional[Promotion]:
        return db.query(Promotion).filter(Promotion.promotion_id == promotion_id).first()

    @staticmethod
    def used_counts(db: Session) -> Dict[int, int]:
        # Đếm giống ClientPromotionService: đơn đã hủy không tính lượt dùng
        rows = (
            db.query(Order.promotion_id, func.count(Order.order_id))
            .filter(Order.promotion_id.isnot(None), Order.status != "Cancelled")
            .group_by(Order.promotion_id)
            .all()
        )
        return {pid: count for pid, count in rows}

    @staticmethod
    def _validate(db: Session, data: PromotionInput, promotion_id: Optional[int] = None) -> str:
        code = data.promotion_code.strip().upper()
        if not code:
            raise HTTPException(status_code=400, detail="Vui lòng nhập mã voucher")
        query = db.query(Promotion.promotion_id).filter(func.upper(Promotion.promotion_code) == code)
        if promotion_id:
            query = query.filter(Promotion.promotion_id != promotion_id)
        if query.first():
            raise HTTPException(status_code=400, detail=f"Mã voucher '{code}' đã tồn tại")
        if data.end_date <= data.start_date:
            raise HTTPException(status_code=400, detail="Ngày kết thúc phải sau ngày bắt đầu")
        mins = [t.min_order_value for t in data.tiers]
        if len(set(mins)) != len(mins):
            raise HTTPException(status_code=400, detail="Các mức giảm không được trùng giá trị đơn tối thiểu")
        return code

    @staticmethod
    def _apply(promo: Promotion, data: PromotionInput, code: str) -> None:
        promo.promotion_code = code
        promo.promotion_name = data.promotion_name.strip()
        promo.description = data.description.strip() if data.description and data.description.strip() else None
        promo.start_date = data.start_date
        promo.end_date = data.end_date
        promo.status = data.status
        promo.usage_limit_per_user = data.usage_limit_per_user
        promo.total_usage_limit = data.total_usage_limit
        promo.invoice_promotions = [
            InvoicePromotion(
                min_order_value=t.min_order_value,
                discount_percentage=t.discount_percentage,
                max_discount_value=t.max_discount_value,
            )
            for t in sorted(data.tiers, key=lambda t: t.min_order_value)
        ]

    @staticmethod
    def create(db: Session, data: PromotionInput) -> Promotion:
        code = AdminPromotionService._validate(db, data)
        promo = Promotion()
        AdminPromotionService._apply(promo, data, code)
        db.add(promo)
        db.commit()
        db.refresh(promo)
        return promo

    @staticmethod
    def update(db: Session, promotion_id: int, data: PromotionInput) -> Optional[Promotion]:
        promo = AdminPromotionService.get_by_id(db, promotion_id)
        if not promo:
            return None
        code = AdminPromotionService._validate(db, data, promotion_id)
        # Xóa hẳn các bậc cũ trước khi thêm lại (khóa chính gồm promotion_id + min_order_value)
        promo.invoice_promotions = []
        db.flush()
        AdminPromotionService._apply(promo, data, code)
        db.commit()
        db.refresh(promo)
        return promo

    @staticmethod
    def update_status(db: Session, promotion_id: int, status: str) -> Optional[Promotion]:
        promo = AdminPromotionService.get_by_id(db, promotion_id)
        if not promo:
            return None
        promo.status = status
        db.commit()
        db.refresh(promo)
        return promo

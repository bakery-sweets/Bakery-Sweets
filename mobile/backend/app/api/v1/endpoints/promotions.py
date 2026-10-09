from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime
from decimal import Decimal

from app.config.database import get_db
from app.models.promotion import Promotion, InvoicePromotion
from app.schemas.promotion import PromotionOut, InvoicePromotionOut

router = APIRouter()

@router.get("/promotions", response_model=List[PromotionOut])
def get_promotions(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả mã khuyến mãi (voucher) đang hoạt động"""
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

        result.append(PromotionOut(
            promotion_id=p.promotion_id,
            promotion_code=p.promotion_code,
            promotion_name=p.promotion_name,
            description=p.description,
            start_date=p.start_date,
            end_date=p.end_date,
            status=p.status,
            min_order_value=best_min_val,
            discount_percentage=best_discount_pct,
            max_discount_value=best_max_discount,
            invoice_promotions=inv_list,
        ))

    return result

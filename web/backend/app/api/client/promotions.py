from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_optional_current_user
from thesweets_common.models.user import User
from app.services.client.promotion_service import ClientPromotionService
from app.schemas.client.promotion import (
    PromotionOut,
    ApplyPromotionRequest,
    ApplyPromotionResponse,
)
from app.schemas.common import ResponseBase

router = APIRouter()

@router.get("", response_model=ResponseBase[List[PromotionOut]], summary="Lấy danh sách mã khuyến mãi khả dụng")
def list_promotions(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    promos = ClientPromotionService.get_promotions(db, current_user=current_user)
    return ResponseBase(data=promos)

@router.post("/apply", response_model=ResponseBase[ApplyPromotionResponse], summary="Kiểm tra và tính thử mức giảm của mã khuyến mãi")
def apply_promotion(
    data: ApplyPromotionRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    customer_id = current_user.customer.customer_id if (current_user and current_user.customer) else None
    promo, discount_amount = ClientPromotionService.calculate_discount(
        db=db,
        code=data.promotion_code,
        total_amount=data.order_amount,
        customer_id=customer_id,
    )
    final_amount = max(Decimal("0.00"), data.order_amount - discount_amount)

    return ResponseBase(
        message="Áp dụng mã khuyến mãi thành công",
        data=ApplyPromotionResponse(
            promotion_id=promo.promotion_id,
            promotion_code=promo.promotion_code,
            promotion_name=promo.promotion_name,
            discount_amount=discount_amount,
            final_amount=final_amount,
        ),
    )

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, get_optional_current_user
from thesweets_common.models.user import User
from app.schemas.promotion import PromotionOut
from app.services.promotion_service import PromotionService

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
    customer_id = current_user.customer.customer_id if current_user and current_user.customer else None
    return PromotionService.get_active_promotions(db, customer_id)

from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_optional_current_user, get_current_customer
from thesweets_common.models.user import User
from app.services.client.promotion_service import ClientPromotionService, SavedVoucherService, to_apply_response
from app.schemas.client.promotion import (
    PromotionOut,
    ApplyPromotionRequest,
    ApplyPromotionResponse,
    SaveVoucherRequest,
    SavedVoucherOut,
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
    applied = ClientPromotionService.resolve_voucher(
        db=db,
        code=data.promotion_code,
        total_amount=data.order_amount,
        customer_id=customer_id,
    )
    return ResponseBase(
        message="Áp dụng mã khuyến mãi thành công",
        data=to_apply_response(applied, data.order_amount),
    )


# ===== Ví voucher: mã dùng 1 lần đã lưu vào tài khoản (chỉ khách đã đăng nhập) =====

def _customer_id(user: User) -> int:
    if not user.customer:
        raise HTTPException(status_code=400, detail="Tài khoản chưa có hồ sơ khách hàng")
    return user.customer.customer_id

@router.get("/saved", response_model=ResponseBase[List[SavedVoucherOut]], summary="Mã giảm giá đã lưu của tôi (còn dùng được)")
def list_saved_vouchers(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
):
    saved = SavedVoucherService.get_saved(db, _customer_id(user))
    return ResponseBase(data=[SavedVoucherService.to_out(s) for s in saved])

@router.post("/saved", response_model=ResponseBase[SavedVoucherOut], summary="Lưu mã dùng 1 lần vào tài khoản")
def save_voucher(
    data: SaveVoucherRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
):
    saved = SavedVoucherService.save(db, _customer_id(user), data.code)
    return ResponseBase(message="Đã lưu mã vào tài khoản", data=SavedVoucherService.to_out(saved))

@router.delete("/saved/{voucher_id}", response_model=ResponseBase[None], summary="Xóa mã khỏi danh sách đã lưu")
def remove_saved_voucher(
    voucher_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
):
    if not SavedVoucherService.remove(db, _customer_id(user), voucher_id):
        raise HTTPException(status_code=404, detail="Mã này không có trong danh sách đã lưu")
    return ResponseBase(message="Đã xóa mã khỏi danh sách đã lưu")

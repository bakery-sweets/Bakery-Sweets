from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.models.user import User
from app.services.admin.promotion_service import AdminPromotionService
from app.schemas.admin.promotion import PromotionInput, PromotionStatusUpdate, AdminPromotionOut, InvoiceTierOut
from app.schemas.common import ResponseBase

router = APIRouter()

def _to_promotion_out(p, used_count: int) -> AdminPromotionOut:
    return AdminPromotionOut(
        promotion_id=p.promotion_id,
        promotion_code=p.promotion_code,
        promotion_name=p.promotion_name,
        description=p.description,
        start_date=p.start_date,
        end_date=p.end_date,
        status=p.status,
        usage_limit_per_user=p.usage_limit_per_user,
        total_usage_limit=p.total_usage_limit,
        used_count=used_count,
        tiers=[
            InvoiceTierOut(
                min_order_value=t.min_order_value,
                discount_percentage=t.discount_percentage,
                max_discount_value=t.max_discount_value,
            )
            for t in sorted(p.invoice_promotions, key=lambda t: t.min_order_value)
        ],
        created_at=p.created_at,
    )

def _with_notified(message: str, p) -> str:
    count = getattr(p, "notified_count", 0)
    return f"{message}, đã gửi thông báo tới {count} khách hàng" if count else message

def _single_out(db: Session, p) -> AdminPromotionOut:
    return _to_promotion_out(p, AdminPromotionService.used_counts(db).get(p.promotion_id, 0))

@router.get("", response_model=ResponseBase[List[AdminPromotionOut]], summary="Lấy danh sách voucher")
def list_promotions(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    used = AdminPromotionService.used_counts(db)
    promos = AdminPromotionService.get_all(db)
    return ResponseBase(data=[_to_promotion_out(p, used.get(p.promotion_id, 0)) for p in promos])

@router.post("", response_model=ResponseBase[AdminPromotionOut], status_code=status.HTTP_201_CREATED, summary="Tạo voucher mới")
def create_promotion(
    data: PromotionInput,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    promo = AdminPromotionService.create(db, data)
    return ResponseBase(message=_with_notified("Tạo voucher thành công", promo), data=_single_out(db, promo))

@router.put("/{promotion_id}", response_model=ResponseBase[AdminPromotionOut], summary="Cập nhật voucher")
def update_promotion(
    promotion_id: int,
    data: PromotionInput,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    promo = AdminPromotionService.update(db, promotion_id, data)
    if not promo:
        raise HTTPException(status_code=404, detail="Không tìm thấy voucher")
    return ResponseBase(message=_with_notified("Cập nhật voucher thành công", promo), data=_single_out(db, promo))

@router.patch("/{promotion_id}/status", response_model=ResponseBase[AdminPromotionOut], summary="Đổi trạng thái voucher")
def update_promotion_status(
    promotion_id: int,
    data: PromotionStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    promo = AdminPromotionService.update_status(db, promotion_id, data.status)
    if not promo:
        raise HTTPException(status_code=404, detail="Không tìm thấy voucher")
    return ResponseBase(message=_with_notified("Cập nhật trạng thái voucher thành công", promo), data=_single_out(db, promo))

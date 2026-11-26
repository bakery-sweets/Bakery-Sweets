from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status as http_status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from thesweets_common.models.user import User
from thesweets_common.models.promotion import SingleUseVoucher, ProductPromotion
from app.services.admin.voucher_service import (
    AdminSingleUseVoucherService,
    AdminProductPromotionService,
    promo_state,
)
from app.services.client.promotion_service import single_use_description
from app.schemas.admin.voucher import (
    SingleUseVoucherGenerate,
    SingleUseVoucherStatusUpdate,
    SingleUseVoucherOut,
    SingleUseVoucherGenerateOut,
    ProductPromotionInput,
    ProductPromotionStatusUpdate,
    ProductPromotionOut,
)
from app.schemas.common import ResponseBase

# ===== Mã giảm giá dùng 1 lần =====

single_use_router = APIRouter()


def _voucher_out(v: SingleUseVoucher, now: datetime) -> SingleUseVoucherOut:
    customer = v.used_by_customer
    return SingleUseVoucherOut(
        voucher_id=v.voucher_id,
        code=v.code,
        discount_type=v.discount_type,
        discount_value=v.discount_value,
        max_discount_value=v.max_discount_value,
        min_order_value=v.min_order_value,
        expires_at=v.expires_at,
        status=v.status,
        is_expired=v.status == "Unused" and v.expires_at is not None and v.expires_at < now,
        batch_name=v.batch_name,
        description=single_use_description(v),
        used_at=v.used_at,
        used_order_id=v.used_order_id,
        used_order_code=v.used_order.order_code if v.used_order else None,
        used_by_name=f"{customer.first_name} {customer.last_name}".strip() if customer else None,
        used_by_phone=customer.phone if customer else None,
        created_by=v.created_by,
        created_at=v.created_at,
    )


@single_use_router.get("", response_model=ResponseBase[List[SingleUseVoucherOut]], summary="Danh sách mã dùng 1 lần")
def list_single_use_vouchers(
    status: Optional[str] = Query(None, description="Unused | Used | Disabled | Expired"),
    search: Optional[str] = Query(None, description="Tìm theo mã hoặc tên đợt phát hành"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    now = datetime.now()
    vouchers = AdminSingleUseVoucherService.get_all(db, status=status, search=search)
    return ResponseBase(data=[_voucher_out(v, now) for v in vouchers])


@single_use_router.post(
    "/generate",
    response_model=ResponseBase[SingleUseVoucherGenerateOut],
    status_code=http_status.HTTP_201_CREATED,
    summary="Sinh ngẫu nhiên một đợt mã dùng 1 lần (8 ký tự)",
)
def generate_single_use_vouchers(
    data: SingleUseVoucherGenerate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    now = datetime.now()
    vouchers = AdminSingleUseVoucherService.generate(db, data, created_by=admin.phone)
    return ResponseBase(
        message=f"Đã tạo {len(vouchers)} mã giảm giá",
        data=SingleUseVoucherGenerateOut(vouchers=[_voucher_out(v, now) for v in vouchers]),
    )


@single_use_router.patch(
    "/{voucher_id}/status",
    response_model=ResponseBase[SingleUseVoucherOut],
    summary="Vô hiệu hóa / kích hoạt lại mã chưa dùng",
)
def update_single_use_status(
    voucher_id: int,
    data: SingleUseVoucherStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    v = AdminSingleUseVoucherService.update_status(db, voucher_id, data.status)
    message = "Đã vô hiệu hóa mã" if data.status == "Disabled" else "Đã kích hoạt lại mã"
    return ResponseBase(message=message, data=_voucher_out(v, datetime.now()))


# ===== Ưu đãi theo sản phẩm =====

product_promo_router = APIRouter()


def _product_promo_out(p: ProductPromotion, now: datetime) -> ProductPromotionOut:
    return ProductPromotionOut(
        id=p.id,
        product_id=p.product_id,
        product_name=p.product.product_name if p.product else f"#{p.product_id}",
        image=p.product.image if p.product else None,
        size_id=p.size_id,
        size_name=p.size.size_name if p.size else None,
        discount_percentage=p.discount_percentage,
        start_date=p.start_date,
        end_date=p.end_date,
        status=p.status,
        state=promo_state(p, now),
        note=p.note,
        prices=AdminProductPromotionService.prices(p),
        created_at=p.created_at,
    )


@product_promo_router.get("", response_model=ResponseBase[List[ProductPromotionOut]], summary="Danh sách ưu đãi theo sản phẩm")
def list_product_promotions(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    now = datetime.now()
    return ResponseBase(data=[_product_promo_out(p, now) for p in AdminProductPromotionService.get_all(db)])


@product_promo_router.post(
    "",
    response_model=ResponseBase[ProductPromotionOut],
    status_code=http_status.HTTP_201_CREATED,
    summary="Tạo khuyến mãi sản phẩm",
)
def create_product_promotion(
    data: ProductPromotionInput,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    p = AdminProductPromotionService.create(db, data)
    return ResponseBase(message="Tạo ưu đãi sản phẩm thành công", data=_product_promo_out(p, datetime.now()))


@product_promo_router.put("/{promo_id}", response_model=ResponseBase[ProductPromotionOut], summary="Cập nhật ưu đãi sản phẩm")
def update_product_promotion(
    promo_id: int,
    data: ProductPromotionInput,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    p = AdminProductPromotionService.update(db, promo_id, data)
    return ResponseBase(message="Cập nhật ưu đãi sản phẩm thành công", data=_product_promo_out(p, datetime.now()))


@product_promo_router.patch(
    "/{promo_id}/status",
    response_model=ResponseBase[ProductPromotionOut],
    summary="Tạm dừng / tiếp tục ưu đãi sản phẩm",
)
def update_product_promotion_status(
    promo_id: int,
    data: ProductPromotionStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    p = AdminProductPromotionService.update_status(db, promo_id, data.status)
    return ResponseBase(message="Cập nhật trạng thái ưu đãi thành công", data=_product_promo_out(p, datetime.now()))


@product_promo_router.delete("/{promo_id}", response_model=ResponseBase[None], summary="Xóa ưu đãi sản phẩm")
def delete_product_promotion(
    promo_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    AdminProductPromotionService.delete(db, promo_id)
    return ResponseBase(message="Đã xóa ưu đãi sản phẩm")

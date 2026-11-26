import secrets
from datetime import datetime
from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from app.core.exceptions import BadRequestError, NotFoundError
from thesweets_common.models.product import Product, ProductSize
from thesweets_common.models.promotion import Promotion, ProductPromotion, SingleUseVoucher
from thesweets_common.pricing import discounted_price
from app.schemas.admin.voucher import SingleUseVoucherGenerate, ProductPromotionInput

# Bỏ các ký tự dễ đọc nhầm khi khách gõ lại mã: 0/O, 1/I/L
CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 8


def _random_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


class AdminSingleUseVoucherService:
    @staticmethod
    def get_all(db: Session, status: Optional[str] = None, search: Optional[str] = None) -> List[SingleUseVoucher]:
        q = db.query(SingleUseVoucher).options(
            joinedload(SingleUseVoucher.used_order),
            joinedload(SingleUseVoucher.used_by_customer),
        )
        now = datetime.now()
        if status == "Expired":
            q = q.filter(
                SingleUseVoucher.status == "Unused",
                SingleUseVoucher.expires_at.isnot(None),
                SingleUseVoucher.expires_at < now,
            )
        elif status == "Unused":
            # "Chưa dùng" chỉ gồm mã còn dùng được (mã quá hạn nằm ở bộ lọc "Hết hạn")
            q = q.filter(
                SingleUseVoucher.status == "Unused",
                (SingleUseVoucher.expires_at.is_(None)) | (SingleUseVoucher.expires_at >= now),
            )
        elif status in ("Used", "Disabled"):
            q = q.filter(SingleUseVoucher.status == status)
        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.filter(SingleUseVoucher.code.ilike(term) | SingleUseVoucher.batch_name.ilike(term))
        return q.order_by(SingleUseVoucher.voucher_id.desc()).all()

    @staticmethod
    def _unique_codes(db: Session, quantity: int) -> List[str]:
        """Sinh mã ngẫu nhiên không trùng mã dùng 1 lần đã có và không trùng mã chương trình khuyến mãi."""
        codes: set[str] = set()
        while len(codes) < quantity:
            batch = {_random_code() for _ in range(quantity - len(codes))} - codes
            taken = {
                c for (c,) in db.query(SingleUseVoucher.code).filter(SingleUseVoucher.code.in_(batch)).all()
            } | {
                c.upper() for (c,) in db.query(Promotion.promotion_code)
                .filter(func.upper(Promotion.promotion_code).in_(batch)).all()
            }
            codes |= batch - taken
        return list(codes)

    @staticmethod
    def generate(db: Session, data: SingleUseVoucherGenerate, created_by: Optional[str]) -> List[SingleUseVoucher]:
        # 31^8 ≈ 850 tỷ tổ hợp nên gần như không trùng; ràng buộc UNIQUE vẫn chặn trường hợp 2 admin sinh cùng lúc
        for _ in range(3):
            vouchers = [
                SingleUseVoucher(
                    code=code,
                    discount_type=data.discount_type,
                    discount_value=data.discount_value,
                    max_discount_value=data.max_discount_value,
                    min_order_value=data.min_order_value,
                    expires_at=data.expires_at,
                    status="Unused",
                    batch_name=data.batch_name,
                    created_by=created_by,
                )
                for code in AdminSingleUseVoucherService._unique_codes(db, data.quantity)
            ]
            try:
                db.add_all(vouchers)
                db.commit()
            except IntegrityError:
                db.rollback()
                continue
            for v in vouchers:
                db.refresh(v)
            return vouchers
        raise BadRequestError("Không sinh được mã, vui lòng thử lại")

    @staticmethod
    def update_status(db: Session, voucher_id: int, status: str) -> SingleUseVoucher:
        v = db.query(SingleUseVoucher).filter(SingleUseVoucher.voucher_id == voucher_id).with_for_update().first()
        if not v:
            raise NotFoundError("Không tìm thấy mã giảm giá")
        if v.status == "Used":
            raise BadRequestError(f"Mã '{v.code}' đã được sử dụng, không thể đổi trạng thái")
        v.status = status
        db.commit()
        db.refresh(v)
        return v


def promo_state(p: ProductPromotion, now: Optional[datetime] = None) -> str:
    now = now or datetime.now()
    if p.status == "Paused":
        return "Paused"
    if p.end_date <= now:
        return "Ended"
    if p.start_date > now:
        return "Upcoming"
    return "Running"


class AdminProductPromotionService:
    @staticmethod
    def get_all(db: Session) -> List[ProductPromotion]:
        return (
            db.query(ProductPromotion)
            .options(
                joinedload(ProductPromotion.product).joinedload(Product.sizes).joinedload(ProductSize.size),
                joinedload(ProductPromotion.size),
            )
            .order_by(ProductPromotion.id.desc())
            .all()
        )

    @staticmethod
    def get_by_id(db: Session, promo_id: int) -> ProductPromotion:
        p = db.query(ProductPromotion).filter(ProductPromotion.id == promo_id).first()
        if not p:
            raise NotFoundError("Không tìm thấy ưu đãi sản phẩm")
        return p

    @staticmethod
    def prices(p: ProductPromotion) -> List[dict]:
        """Giá niêm yết -> giá sau giảm của các size được áp dụng."""
        sizes = p.product.sizes if p.product else []
        return [
            {
                "size_id": s.size_id,
                "size_name": s.size.size_name if s.size else "",
                "price": s.price,
                "sale_price": discounted_price(s.price, p.discount_percentage),
            }
            for s in sorted(sizes, key=lambda s: s.price)
            if p.size_id is None or s.size_id == p.size_id
        ]

    @staticmethod
    def _validate(db: Session, data: ProductPromotionInput) -> None:
        product = db.query(Product).filter(Product.product_id == data.product_id).first()
        if not product:
            raise BadRequestError("Sản phẩm không tồn tại")
        if data.size_id is not None and not any(s.size_id == data.size_id for s in product.sizes):
            raise BadRequestError(f"Sản phẩm '{product.product_name}' không có kích cỡ này")

    @staticmethod
    def _apply(p: ProductPromotion, data: ProductPromotionInput) -> None:
        p.product_id = data.product_id
        p.size_id = data.size_id
        p.discount_percentage = data.discount_percentage
        p.start_date = data.start_date
        p.end_date = data.end_date
        p.status = data.status
        p.note = data.note

    @staticmethod
    def create(db: Session, data: ProductPromotionInput) -> ProductPromotion:
        AdminProductPromotionService._validate(db, data)
        p = ProductPromotion()
        AdminProductPromotionService._apply(p, data)
        db.add(p)
        db.commit()
        db.refresh(p)
        return p

    @staticmethod
    def update(db: Session, promo_id: int, data: ProductPromotionInput) -> ProductPromotion:
        p = AdminProductPromotionService.get_by_id(db, promo_id)
        AdminProductPromotionService._validate(db, data)
        AdminProductPromotionService._apply(p, data)
        db.commit()
        db.refresh(p)
        return p

    @staticmethod
    def update_status(db: Session, promo_id: int, status: str) -> ProductPromotion:
        p = AdminProductPromotionService.get_by_id(db, promo_id)
        p.status = status
        db.commit()
        db.refresh(p)
        return p

    @staticmethod
    def delete(db: Session, promo_id: int) -> None:
        # Xóa được: đơn cũ đã lưu giá bán & giá niêm yết trong order_detail, không tham chiếu tới bảng này
        p = AdminProductPromotionService.get_by_id(db, promo_id)
        db.delete(p)
        db.commit()

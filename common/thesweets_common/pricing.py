"""
Giá bán & mã giảm giá dùng chung cho Web Backend và Mobile Backend.

- Khuyến mãi theo sản phẩm (bảng product_promotions): giá bán thực tế = giá niêm yết trừ % giảm.
  Nhiều ưu đãi cùng hiệu lực cho một sản phẩm/size thì lấy mức giảm cao nhất.
- Mã dùng 1 lần (bảng single_use_vouchers): hàm trả mã khi đơn bị hủy, để mọi luồng hủy đơn dùng chung.
"""
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Iterable, Optional, Tuple

from sqlalchemy.orm import Session

from thesweets_common.models.promotion import ProductPromotion, SingleUseVoucher

PriceKey = Tuple[int, int]  # (product_id, size_id)


@dataclass(frozen=True)
class PriceQuote:
    price: Decimal                              # Giá bán thực tế (đã trừ ưu đãi)
    original_price: Optional[Decimal] = None    # Giá niêm yết, chỉ có khi được giảm
    discount_percentage: Optional[Decimal] = None
    promo_end_date: Optional[datetime] = None

    @property
    def is_discounted(self) -> bool:
        return self.original_price is not None


def discounted_price(price: Decimal, percentage: Decimal) -> Decimal:
    """Làm tròn tới đồng."""
    raw = Decimal(price) * (Decimal("100") - Decimal(percentage)) / Decimal("100")
    return max(Decimal("0"), raw.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def active_product_promotions(
    db: Session, product_ids: Optional[Iterable[int]] = None, now: Optional[datetime] = None
) -> Dict[int, list]:
    """Các ưu đãi đang hiệu lực, gom theo product_id."""
    now = now or datetime.now()
    q = db.query(ProductPromotion).filter(
        ProductPromotion.status == "Active",
        ProductPromotion.start_date <= now,
        ProductPromotion.end_date > now,
    )
    if product_ids is not None:
        ids = list(set(product_ids))
        if not ids:
            return {}
        q = q.filter(ProductPromotion.product_id.in_(ids))
    grouped: Dict[int, list] = {}
    for promo in q.all():
        grouped.setdefault(promo.product_id, []).append(promo)
    return grouped


def best_promotion(promos_by_product: Dict[int, list], product_id: int, size_id: int) -> Optional[ProductPromotion]:
    candidates = [
        p for p in promos_by_product.get(product_id, ())
        if p.size_id is None or p.size_id == size_id
    ]
    # Bằng % thì ưu tiên ưu đãi hết hạn sớm hơn (hiện hạn gần nhất cho khách)
    return max(candidates, key=lambda p: (p.discount_percentage, -p.end_date.timestamp()), default=None)


def quote(price: Decimal, promo: Optional[ProductPromotion]) -> PriceQuote:
    if not promo:
        return PriceQuote(price=price)
    return PriceQuote(
        price=discounted_price(price, promo.discount_percentage),
        original_price=price,
        discount_percentage=promo.discount_percentage,
        promo_end_date=promo.end_date,
    )


class PriceBook:
    """Tra giá bán cho nhiều sản phẩm với 1 câu truy vấn ưu đãi."""

    def __init__(self, db: Session, product_ids: Optional[Iterable[int]] = None, now: Optional[datetime] = None):
        self._promos = active_product_promotions(db, product_ids, now)

    def quote(self, product_id: int, size_id: int, price: Decimal) -> PriceQuote:
        return quote(price, best_promotion(self._promos, product_id, size_id))

    def quote_size(self, ps) -> PriceQuote:
        """ps: ProductSize"""
        return self.quote(ps.product_id, ps.size_id, ps.price)


def release_single_use_voucher(db: Session, order_id: int) -> Optional[str]:
    """
    Đơn bị hủy: trả mã dùng 1 lần của đơn về trạng thái chưa dùng để khách dùng lại.
    Trả về mã đã trả lại (để ghi vào log), None nếu đơn không dùng mã nào.
    """
    voucher = (
        db.query(SingleUseVoucher)
        .filter(SingleUseVoucher.used_order_id == order_id)
        .with_for_update()
        .first()
    )
    if not voucher:
        return None
    voucher.status = "Unused"
    voucher.used_order_id = None
    voucher.used_by_customer_id = None
    voucher.used_at = None
    return voucher.code


__all__ = [
    "PriceQuote",
    "PriceBook",
    "discounted_price",
    "active_product_promotions",
    "best_promotion",
    "quote",
    "release_single_use_voucher",
]

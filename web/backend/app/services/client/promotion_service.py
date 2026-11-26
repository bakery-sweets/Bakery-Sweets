import re
from dataclasses import dataclass
from typing import List, Optional, Tuple
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.core.exceptions import BadRequestError
from thesweets_common.models.promotion import Promotion, InvoicePromotion, OrderPromotion, SingleUseVoucher, CustomerSavedVoucher
from thesweets_common.models.order import Order
from thesweets_common.models.user import User
from app.schemas.client.promotion import PromotionOut, InvoicePromotionOut, ApplyPromotionResponse, SingleUseRuleOut, SavedVoucherOut

# Mã dùng 1 lần: đúng 8 ký tự chữ in hoa / số
SINGLE_USE_CODE_RE = re.compile(r"^[A-Z0-9]{8}$")
SINGLE_USE_DEFAULT_NAME = "Mã giảm giá dùng 1 lần"


def _money(v: Decimal) -> str:
    return f"{v:,.0f}".replace(",", ".") + "đ"


def single_use_description(v: SingleUseVoucher) -> str:
    if v.discount_type == "fixed":
        text = f"Giảm {_money(v.discount_value)}"
    else:
        text = f"Giảm {+float(v.discount_value):g}%"
        if v.max_discount_value:
            text += f" tối đa {_money(v.max_discount_value)}"
    if v.min_order_value and v.min_order_value > 0:
        text += f" cho đơn từ {_money(v.min_order_value)}"
    return text


def single_use_discount(v: SingleUseVoucher, total_amount: Decimal) -> Decimal:
    if v.discount_type == "fixed":
        discount = Decimal(v.discount_value)
    else:
        discount = total_amount * Decimal(v.discount_value) / Decimal("100")
        if v.max_discount_value is not None and v.max_discount_value > 0:
            discount = min(discount, Decimal(v.max_discount_value))
    return min(discount, total_amount).quantize(Decimal("1.00"))


@dataclass
class AppliedVoucher:
    """Kết quả áp mã: hoặc chương trình khuyến mãi (promotions), hoặc mã dùng 1 lần (single_use_vouchers)."""
    kind: str  # "promotion" | "single_use"
    code: str
    name: str
    discount_amount: Decimal
    promotion: Optional[Promotion] = None
    voucher: Optional[SingleUseVoucher] = None

    @property
    def promotion_id(self) -> Optional[int]:
        return self.promotion.promotion_id if self.promotion else None


class ClientPromotionService:
    @staticmethod
    def get_promotions(db: Session, current_user: Optional[User] = None) -> List[PromotionOut]:
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

        # Tổng lượt dùng toàn hệ thống, cùng cách đếm với calculate_discount
        total_usage_counts = dict(
            db.query(Order.promotion_id, func.count(Order.order_id))
            .filter(Order.promotion_id.isnot(None), Order.status != "Cancelled")
            .group_by(Order.promotion_id)
            .all()
        )

        user_usage_counts = {}
        if current_user and current_user.customer:
            customer_id = current_user.customer.customer_id
            usage_records = (
                db.query(Order.promotion_id, func.count(Order.order_id))
                .filter(
                    Order.customer_id == customer_id,
                    Order.promotion_id.isnot(None),
                    Order.status != "Cancelled",
                )
                .group_by(Order.promotion_id)
                .all()
            )
            user_usage_counts = {p_id: count for p_id, count in usage_records}

        result = []
        for p in promos:
            inv_list = []
            best_min_val = Decimal("0.00")
            best_discount_pct = Decimal("0.00")
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

            used_times = user_usage_counts.get(p.promotion_id, 0)
            limit_per_user = p.usage_limit_per_user if p.usage_limit_per_user is not None else 1
            is_used = used_times >= limit_per_user
            can_use = not is_used

            # Chỉ trả về mã khách còn dùng được: bỏ mã khách đã dùng hết lượt và mã đã hết lượt toàn hệ thống
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
                can_use=can_use,
                min_order_value=best_min_val,
                discount_percentage=best_discount_pct,
                max_discount_value=best_max_discount,
                invoice_promotions=inv_list,
            ))

        return result

    @staticmethod
    def calculate_discount(
        db: Session,
        code: str,
        total_amount: Decimal,
        customer_id: Optional[int] = None,
    ) -> Tuple[Promotion, Decimal]:
        """
        Xác thực mã voucher và tính số tiền giảm giá.
        Trả về (Promotion, discount_amount).
        """
        now = datetime.now()
        promo = (
            db.query(Promotion)
            .options(joinedload(Promotion.invoice_promotions))
            .filter(
                func.upper(Promotion.promotion_code) == code.strip().upper(),
                Promotion.status == "Active",
            )
            .first()
        )

        if not promo:
            raise BadRequestError("Mã khuyến mãi không tồn tại hoặc đã hết hiệu lực")

        if promo.start_date > now:
            raise BadRequestError("Chương trình khuyến mãi chưa bắt đầu")

        if promo.end_date < now:
            raise BadRequestError("Chương trình khuyến mãi đã kết thúc")

        # Kiểm tra tổng lượt dùng toàn hệ thống nếu có cấu hình
        if promo.total_usage_limit is not None:
            total_used = (
                db.query(func.count(Order.order_id))
                .filter(Order.promotion_id == promo.promotion_id, Order.status != "Cancelled")
                .scalar()
            ) or 0
            if total_used >= promo.total_usage_limit:
                raise BadRequestError("Mã khuyến mãi đã hết lượt sử dụng trên hệ thống")

        # Kiểm tra số lượt dùng của khách hàng
        if customer_id and promo.usage_limit_per_user is not None:
            user_used = (
                db.query(func.count(Order.order_id))
                .filter(
                    Order.customer_id == customer_id,
                    Order.promotion_id == promo.promotion_id,
                    Order.status != "Cancelled",
                )
                .scalar()
            ) or 0
            if user_used >= promo.usage_limit_per_user:
                raise BadRequestError(
                    f"Bạn đã sử dụng tối đa ({promo.usage_limit_per_user} lần) cho mã khuyến mãi này",
                )

        # Tính toán mức giảm theo các bậc hóa đơn trong invoice_promotions
        discount_amount = Decimal("0.00")
        if promo.invoice_promotions:
            # Lọc các bậc mà đơn hàng đạt mức tối thiểu, lấy bậc có min_order_value cao nhất
            applicable = [
                inv for inv in promo.invoice_promotions
                if total_amount >= inv.min_order_value
            ]
            if not applicable:
                min_req = min(inv.min_order_value for inv in promo.invoice_promotions)
                raise BadRequestError(
                    f"Đơn hàng chưa đạt mức tối thiểu {min_req:,.0f}đ để áp dụng mã này",
                )

            # Lấy bậc có min_order_value lớn nhất
            best_tier = max(applicable, key=lambda x: x.min_order_value)
            raw_discount = (total_amount * best_tier.discount_percentage) / Decimal("100")
            if best_tier.max_discount_value is not None and best_tier.max_discount_value > 0:
                discount_amount = min(raw_discount, best_tier.max_discount_value)
            else:
                discount_amount = raw_discount

        # Không vượt quá tổng tiền hóa đơn
        discount_amount = min(discount_amount, total_amount)
        # Làm tròn 2 chữ số thập phân
        discount_amount = discount_amount.quantize(Decimal("1.00"))

        return promo, discount_amount

    @staticmethod
    def check_single_use(
        db: Session, code: str, total_amount: Decimal, lock: bool = False
    ) -> Optional[Tuple[SingleUseVoucher, Decimal]]:
        """
        Kiểm tra mã dùng 1 lần. Trả về None nếu không có mã này (để thử tiếp bảng promotions).
        lock=True: khóa dòng mã tới khi commit để 2 đơn đồng thời không cùng dùng 1 mã.
        """
        code = code.strip().upper()
        if not SINGLE_USE_CODE_RE.match(code):
            return None
        q = db.query(SingleUseVoucher).filter(SingleUseVoucher.code == code)
        if lock:
            q = q.with_for_update()
        v = q.first()
        if not v:
            return None
        if v.status == "Used":
            raise BadRequestError(f"Mã '{code}' đã được sử dụng")
        if v.status == "Disabled":
            raise BadRequestError(f"Mã '{code}' đã bị vô hiệu hóa")
        if v.expires_at is not None and v.expires_at < datetime.now():
            raise BadRequestError(f"Mã '{code}' đã hết hạn")
        if total_amount < v.min_order_value:
            raise BadRequestError(
                f"Đơn hàng chưa đạt mức tối thiểu {v.min_order_value:,.0f}đ để áp dụng mã này".replace(",", "."),
            )
        return v, single_use_discount(v, total_amount)

    @staticmethod
    def resolve_voucher(
        db: Session,
        code: str,
        total_amount: Decimal,
        customer_id: Optional[int] = None,
        lock: bool = False,
    ) -> AppliedVoucher:
        """Áp một mã bất kỳ khách nhập: ưu tiên mã dùng 1 lần, không có thì tìm chương trình khuyến mãi."""
        code = (code or "").strip().upper()
        if not code:
            raise BadRequestError("Vui lòng nhập mã giảm giá")
        single = ClientPromotionService.check_single_use(db, code, total_amount, lock=lock)
        if single:
            v, discount = single
            return AppliedVoucher(
                kind="single_use",
                code=v.code,
                name=v.batch_name or SINGLE_USE_DEFAULT_NAME,
                discount_amount=discount,
                voucher=v,
            )
        promo, discount = ClientPromotionService.calculate_discount(db, code, total_amount, customer_id)
        return AppliedVoucher(
            kind="promotion",
            code=promo.promotion_code,
            name=promo.promotion_name,
            discount_amount=discount,
            promotion=promo,
        )

    @staticmethod
    def redeem(db: Session, applied: Optional[AppliedVoucher], order: Order, customer_id: Optional[int]) -> None:
        """Ghi nhận mã đã dùng cho đơn (gọi sau khi order đã flush có order_id, trước commit)."""
        if not applied:
            return
        if applied.kind == "single_use":
            v = applied.voucher
            v.status = "Used"
            v.used_order_id = order.order_id
            v.used_by_customer_id = customer_id
            v.used_at = datetime.now()
        else:
            db.add(OrderPromotion(
                order_id=order.order_id,
                promotion_id=applied.promotion_id,
                discount_amount=applied.discount_amount,
            ))


def _rule_out(v: SingleUseVoucher) -> SingleUseRuleOut:
    return SingleUseRuleOut(
        discount_type=v.discount_type,
        discount_value=v.discount_value,
        max_discount_value=v.max_discount_value,
        min_order_value=v.min_order_value or Decimal("0.00"),
        expires_at=v.expires_at,
    )


class SavedVoucherService:
    """
    Ví voucher của khách đã đăng nhập: lưu các mã dùng 1 lần khách đã nhập.
    Chỉ trả về mã còn dùng được; mã đã dùng / hết hạn / bị vô hiệu hóa tự ẩn
    (đơn dùng mã bị hủy -> mã được trả lại Unused -> hiện lại trong ví).
    """

    @staticmethod
    def _usable_filter(q):
        now = datetime.now()
        return q.filter(
            SingleUseVoucher.status == "Unused",
            (SingleUseVoucher.expires_at.is_(None)) | (SingleUseVoucher.expires_at >= now),
        )

    @staticmethod
    def to_out(saved: CustomerSavedVoucher) -> SavedVoucherOut:
        v = saved.voucher
        return SavedVoucherOut(
            voucher_id=v.voucher_id,
            code=v.code,
            name=v.batch_name or SINGLE_USE_DEFAULT_NAME,
            description=single_use_description(v),
            single_use=_rule_out(v),
            saved_at=saved.saved_at,
        )

    @staticmethod
    def get_saved(db: Session, customer_id: int) -> List[CustomerSavedVoucher]:
        q = (
            db.query(CustomerSavedVoucher)
            .join(SingleUseVoucher, SingleUseVoucher.voucher_id == CustomerSavedVoucher.voucher_id)
            .options(joinedload(CustomerSavedVoucher.voucher))
            .filter(CustomerSavedVoucher.customer_id == customer_id)
        )
        return SavedVoucherService._usable_filter(q).order_by(CustomerSavedVoucher.saved_at.desc()).all()

    @staticmethod
    def save(db: Session, customer_id: int, code: str) -> CustomerSavedVoucher:
        code = (code or "").strip().upper()
        v = db.query(SingleUseVoucher).filter(SingleUseVoucher.code == code).first() if SINGLE_USE_CODE_RE.match(code) else None
        if not v:
            raise BadRequestError("Chỉ lưu được mã giảm giá dùng 1 lần (8 ký tự)")
        if v.status == "Used":
            raise BadRequestError(f"Mã '{code}' đã được sử dụng")
        if v.status == "Disabled":
            raise BadRequestError(f"Mã '{code}' đã bị vô hiệu hóa")
        if v.expires_at is not None and v.expires_at < datetime.now():
            raise BadRequestError(f"Mã '{code}' đã hết hạn")

        saved = db.query(CustomerSavedVoucher).filter(
            CustomerSavedVoucher.customer_id == customer_id,
            CustomerSavedVoucher.voucher_id == v.voucher_id,
        ).first()
        if saved:
            # Nhập lại mã đã lưu: đưa lên đầu ví
            saved.saved_at = datetime.now()
        else:
            saved = CustomerSavedVoucher(customer_id=customer_id, voucher_id=v.voucher_id, saved_at=datetime.now())
            db.add(saved)
        db.commit()
        db.refresh(saved)
        return saved

    @staticmethod
    def remove(db: Session, customer_id: int, voucher_id: int) -> bool:
        deleted = db.query(CustomerSavedVoucher).filter(
            CustomerSavedVoucher.customer_id == customer_id,
            CustomerSavedVoucher.voucher_id == voucher_id,
        ).delete()
        db.commit()
        return deleted > 0


def to_apply_response(applied: AppliedVoucher, order_amount: Decimal) -> ApplyPromotionResponse:
    v = applied.voucher
    return ApplyPromotionResponse(
        kind=applied.kind,
        promotion_id=applied.promotion_id,
        promotion_code=applied.code,
        promotion_name=applied.name,
        description=single_use_description(v) if v else (applied.promotion.description if applied.promotion else None),
        discount_amount=applied.discount_amount,
        final_amount=max(Decimal("0.00"), order_amount - applied.discount_amount),
        single_use=_rule_out(v) if v else None,
    )

from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

class InvoicePromotionOut(BaseModel):
    min_order_value: Decimal
    discount_percentage: Decimal
    max_discount_value: Optional[Decimal] = None

class PromotionOut(BaseModel):
    promotion_id: int
    promotion_code: str
    promotion_name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    status: str
    usage_limit_per_user: Optional[int] = 1
    total_usage_limit: Optional[int] = None
    used_by_current_user: int = 0
    is_used: bool = False
    can_use: bool = True
    min_order_value: Decimal = Decimal("0.00")
    discount_percentage: Decimal = Decimal("0.00")
    max_discount_value: Optional[Decimal] = None
    invoice_promotions: List[InvoicePromotionOut] = []

class ApplyPromotionRequest(BaseModel):
    promotion_code: str
    order_amount: Decimal

class SingleUseRuleOut(BaseModel):
    """Điều kiện của mã dùng 1 lần, để trang thanh toán tự tính lại khi giỏ hàng thay đổi"""
    discount_type: str  # percent | fixed
    discount_value: Decimal
    max_discount_value: Optional[Decimal] = None
    min_order_value: Decimal = Decimal("0.00")
    expires_at: Optional[datetime] = None

class SaveVoucherRequest(BaseModel):
    code: str

class SavedVoucherOut(BaseModel):
    """Mã dùng 1 lần trong ví của khách (chỉ gồm mã còn dùng được)"""
    voucher_id: int
    code: str
    name: str
    description: str
    single_use: SingleUseRuleOut
    saved_at: Optional[datetime] = None

class ApplyPromotionResponse(BaseModel):
    # promotion: chương trình khuyến mãi | single_use: mã dùng 1 lần
    kind: str = "promotion"
    promotion_id: Optional[int] = None
    promotion_code: str
    promotion_name: str
    description: Optional[str] = None
    discount_amount: Decimal
    final_amount: Decimal
    single_use: Optional[SingleUseRuleOut] = None

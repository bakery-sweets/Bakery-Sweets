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

class ApplyPromotionResponse(BaseModel):
    promotion_id: int
    promotion_code: str
    promotion_name: str
    discount_amount: Decimal
    final_amount: Decimal

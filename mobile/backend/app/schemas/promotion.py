from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class InvoicePromotionOut(BaseModel):
    min_order_value: Decimal
    discount_percentage: Decimal
    max_discount_value: Optional[Decimal] = None

    class Config:
        from_attributes = True

class PromotionOut(BaseModel):
    promotion_id: int
    promotion_code: str
    promotion_name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    status: str
    min_order_value: Decimal = Decimal("0.0")
    discount_percentage: Decimal = Decimal("0.0")
    max_discount_value: Optional[Decimal] = None
    invoice_promotions: List[InvoicePromotionOut] = []

    class Config:
        from_attributes = True

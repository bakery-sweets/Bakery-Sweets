from typing import Optional, List, Literal
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal

class InvoiceTierInput(BaseModel):
    min_order_value: Decimal = Field(..., ge=0)
    discount_percentage: Decimal = Field(..., gt=0, le=100)
    max_discount_value: Optional[Decimal] = Field(None, ge=0)

class PromotionInput(BaseModel):
    promotion_code: str = Field(..., min_length=1, max_length=50)
    promotion_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    status: Literal["Draft", "Active", "Paused", "Expired"] = "Active"
    usage_limit_per_user: int = Field(1, ge=1)
    # None: không giới hạn tổng lượt dùng
    total_usage_limit: Optional[int] = Field(None, ge=1)
    tiers: List[InvoiceTierInput] = Field(..., min_length=1)

class PromotionStatusUpdate(BaseModel):
    status: Literal["Draft", "Active", "Paused", "Expired"]

class InvoiceTierOut(BaseModel):
    min_order_value: Decimal
    discount_percentage: Decimal
    max_discount_value: Optional[Decimal] = None

class AdminPromotionOut(BaseModel):
    promotion_id: int
    promotion_code: str
    promotion_name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    status: str
    usage_limit_per_user: Optional[int] = None
    total_usage_limit: Optional[int] = None
    # Số đơn (chưa hủy) đã dùng mã, cùng cách đếm với lúc khách áp mã
    used_count: int = 0
    tiers: List[InvoiceTierOut] = []
    created_at: Optional[datetime] = None

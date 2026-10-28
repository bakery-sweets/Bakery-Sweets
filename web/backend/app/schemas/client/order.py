import re
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from decimal import Decimal

class CheckoutOrderItem(BaseModel):
    product_id: int
    size_id: int
    quantity: int = Field(..., gt=0)

class CheckoutRequest(BaseModel):
    recipient_name: str
    recipient_phone: str
    pickup_time: Optional[datetime] = None
    notes: Optional[str] = None
    payment_method: Literal["COD", "Banking", "Momo", "Credit Card", "VNPay"] = "COD"
    items: Optional[List[CheckoutOrderItem]] = None
    voucher_code: Optional[str] = None

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v_trimmed = v.strip()
            if not v_trimmed:
                return None
            if len(v_trimmed) > 200:
                raise ValueError("Ghi chú không được vượt quá 200 ký tự")
            words = v_trimmed.split()
            if len(words) > 50:
                raise ValueError("Ghi chú không được chứa quá 50 chữ")
            # Chặn 1 chữ kéo dài vô nghĩa không có dấu cách (vd: aaaaaaaaaaaaaaaaaaaaaaaaaaaaa)
            if any(len(w) > 25 for w in words):
                raise ValueError("Ghi chú không được chứa từ quá dài")
            # Chặn ký tự lặp liên tiếp vô nghĩa >= 5 lần (vd: aaaaa...)
            if re.search(r'(.)\1{4,}', v_trimmed):
                raise ValueError("Ghi chú không được chứa ký tự lặp lại nhiều lần")
            return v_trimmed
        return v

class CancelOrderRequest(BaseModel):
    note: Optional[str] = None

class ClientOrderDetailOut(BaseModel):
    product_id: int
    product_name: str
    image: Optional[str] = None
    size_id: int
    size_name: str
    quantity: int
    price: Decimal
    total_price: Decimal
    note: Optional[str] = None

class ClientOrderOut(BaseModel):
    order_id: int
    order_code: Optional[str] = None
    recipient_name: str
    recipient_phone: str
    pickup_time: Optional[datetime] = None
    notes: Optional[str] = None
    promotion_id: Optional[int] = None
    promotion_code: Optional[str] = None
    total_quantity: int
    total_cost: Decimal
    discount_amount: Decimal
    final_cost: Decimal
    payment_method: str
    payment_status: str
    status: str
    order_date: datetime
    details: List[ClientOrderDetailOut] = []

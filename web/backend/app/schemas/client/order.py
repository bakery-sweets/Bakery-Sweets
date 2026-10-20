from typing import Optional, List, Literal
from pydantic import BaseModel, Field
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
    total_quantity: int
    total_cost: Decimal
    discount_amount: Decimal
    final_cost: Decimal
    payment_method: str
    payment_status: str
    status: str
    order_date: datetime
    details: List[ClientOrderDetailOut] = []

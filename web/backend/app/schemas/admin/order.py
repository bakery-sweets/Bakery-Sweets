from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

class AdminOrderDetailOut(BaseModel):
    product_id: int
    product_name: str
    size_name: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal

class AdminOrderOut(BaseModel):
    order_id: int
    order_code: Optional[str] = None
    recipient_name: str
    recipient_phone: str
    shipping_address: str
    total_cost: Decimal
    final_cost: Decimal
    status: str
    payment_method: str
    payment_status: str
    order_date: datetime
    details: List[AdminOrderDetailOut] = []

class AdminOrderStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None

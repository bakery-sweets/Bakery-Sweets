from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

class CheckoutOrderItem(BaseModel):
    product_id: int
    size_id: int
    quantity: int

class CheckoutRequest(BaseModel):
    recipient_name: str
    recipient_phone: str
    shipping_address: str
    shipping_city: Optional[str] = "TP. Hồ Chí Minh"
    notes: Optional[str] = None
    payment_method: str = "COD"
    items: Optional[List[CheckoutOrderItem]] = None

class ClientOrderDetailOut(BaseModel):
    product_id: int
    product_name: str
    image: Optional[str] = None
    size_name: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal

class ClientOrderOut(BaseModel):
    order_id: int
    order_code: Optional[str] = None
    recipient_name: str
    shipping_address: str
    total_quantity: int
    final_cost: Decimal
    payment_method: str
    payment_status: str
    status: str
    order_date: datetime
    details: List[ClientOrderDetailOut] = []

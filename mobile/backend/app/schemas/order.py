from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# Cart Schemas
class CartItemAdd(BaseModel):
    product_id: int
    size_id: int
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int

class CartItemOut(BaseModel):
    cart_id: int
    product_id: int
    product_name: str
    image: Optional[str] = None
    size_id: int
    size_name: str
    price: Decimal
    quantity: int
    subtotal: Decimal

    class Config:
        from_attributes = True

# Order Schemas
class OrderItemCreate(BaseModel):
    product_id: int
    size_id: int
    quantity: int
    note: Optional[str] = None

class OrderCreate(BaseModel):
    recipient_name: str
    recipient_phone: str
    pickup_time: Optional[datetime] = None
    notes: Optional[str] = None
    promotion_id: Optional[int] = None
    payment_method: str = "COD"
    items: List[OrderItemCreate]

class OrderDetailOut(BaseModel):
    product_id: int
    product_name: str
    image: Optional[str] = None
    size_id: int
    size_name: str
    quantity: int
    price: Decimal
    subtotal: Decimal
    note: Optional[str] = None

    class Config:
        from_attributes = True

class OrderStatusLogOut(BaseModel):
    log_id: int
    old_status: Optional[str] = None
    new_status: str
    note: Optional[str] = None
    changed_at: datetime
    changed_by: Optional[str] = None

    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    order_id: int
    order_code: Optional[str] = None
    customer_id: int
    recipient_name: str
    recipient_phone: str
    pickup_time: Optional[datetime] = None
    notes: Optional[str] = None
    promotion_id: Optional[int] = None
    discount_amount: Decimal
    total_quantity: int
    total_cost: Decimal
    final_cost: Decimal
    payment_method: str
    payment_status: str
    status: str
    order_date: datetime
    details: List[OrderDetailOut] = []
    status_logs: List[OrderStatusLogOut] = []

    class Config:
        from_attributes = True

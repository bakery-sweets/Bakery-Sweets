from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal

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
    unit_price: Decimal
    quantity: int
    item_total: Decimal

class CartSummaryOut(BaseModel):
    items: List[CartItemOut]
    total_items: int
    total_amount: Decimal

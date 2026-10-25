from typing import Optional, List
from pydantic import BaseModel, Field
from decimal import Decimal

class CartItemAdd(BaseModel):
    product_id: int
    size_id: int
    quantity: int = Field(1, gt=0)

class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=0)

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
    stock_quantity: int = 0  # Tồn kho của size, để giỏ hàng chặn tăng quá số lượng

class CartSummaryOut(BaseModel):
    items: List[CartItemOut]
    total_items: int
    total_amount: Decimal

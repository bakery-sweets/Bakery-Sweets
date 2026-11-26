from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

class CategoryOut(BaseModel):
    category_id: int
    category_name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class SizeOut(BaseModel):
    size_id: int
    size_name: str

    class Config:
        from_attributes = True

class ProductSizeOut(BaseModel):
    id: int
    size_id: int
    size_name: Optional[str] = None
    price: Decimal
    stock_quantity: int
    # Đang khuyến mãi: giá niêm yết, % giảm, thời điểm kết thúc (không có lý do khuyến mãi)
    original_price: Optional[Decimal] = None
    discount_percentage: Optional[Decimal] = None
    promo_end_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProductOut(BaseModel):
    product_id: int
    product_name: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    status: str
    ingredients: Optional[str] = None
    expiration_date: Optional[str] = None
    storage_instructions: Optional[str] = None
    image: Optional[str] = None
    sizes: List[ProductSizeOut] = []

    class Config:
        from_attributes = True

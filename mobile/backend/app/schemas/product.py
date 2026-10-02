from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal

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

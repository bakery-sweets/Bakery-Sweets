from typing import Optional, List
from pydantic import BaseModel, Field
from decimal import Decimal

class ProductSizeInput(BaseModel):
    size_id: int
    price: Decimal
    stock_quantity: int = 0

class ProductSizeOut(BaseModel):
    id: int
    size_id: int
    size_name: Optional[str] = None
    price: Decimal
    stock_quantity: int

class ProductCreate(BaseModel):
    product_name: str = Field(..., max_length=255)
    category_id: Optional[int] = None
    status: str = "Available"
    ingredients: Optional[str] = None
    expiration_date: Optional[str] = None
    storage_instructions: Optional[str] = None
    image: Optional[str] = None
    sizes: List[ProductSizeInput] = []

class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    category_id: Optional[int] = None
    status: Optional[str] = None
    ingredients: Optional[str] = None
    expiration_date: Optional[str] = None
    storage_instructions: Optional[str] = None
    image: Optional[str] = None
    sizes: Optional[List[ProductSizeInput]] = None

class AdminProductOut(BaseModel):
    product_id: int
    product_name: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    status: str
    image: Optional[str] = None
    sizes: List[ProductSizeOut] = []

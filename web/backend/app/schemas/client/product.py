from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal

class ClientCategoryOut(BaseModel):
    category_id: int
    category_name: str
    description: Optional[str] = None

class ClientSizeOut(BaseModel):
    size_id: int
    size_name: str
    extra_price: Decimal = Decimal("0.00")

class ClientProductSizeOut(BaseModel):
    id: int
    size_id: int
    size_name: str
    price: Decimal
    stock_quantity: int

class ClientProductOut(BaseModel):
    product_id: int
    product_name: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    status: str
    ingredients: Optional[str] = None
    storage_instructions: Optional[str] = None
    image: Optional[str] = None
    min_price: Optional[Decimal] = None
    sizes: List[ClientProductSizeOut] = []

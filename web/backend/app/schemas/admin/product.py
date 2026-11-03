from typing import Optional, List
from pydantic import BaseModel, Field
from decimal import Decimal
from app.schemas.common import ExcelRowError

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
    ingredients: Optional[str] = None
    expiration_date: Optional[str] = None
    storage_instructions: Optional[str] = None
    image: Optional[str] = None
    sizes: List[ProductSizeOut] = []

# ===== Cập nhật giá bán hàng loạt từ file Excel =====

class PriceChangeOut(BaseModel):
    """Một dòng đổi giá đọc từ file Excel (giá cũ lấy từ CSDL lúc đọc file)"""
    row: int
    product_id: int
    product_name: str
    size_id: int
    size_name: str
    old_price: Decimal
    new_price: Decimal

class PriceExcelPreviewOut(BaseModel):
    changes: List[PriceChangeOut] = []
    unchanged: int = 0  # Số dòng điền giá mới nhưng trùng giá hiện tại
    errors: List[ExcelRowError] = []

class PriceUpdateItem(BaseModel):
    product_id: int
    size_id: int
    price: Decimal = Field(..., ge=0, lt=Decimal("1e13"))
    # Giá lúc xem trước: khác giá hiện tại nghĩa là đã có người sửa giá trong lúc đó
    old_price: Optional[Decimal] = None

class PriceBulkUpdate(BaseModel):
    items: List[PriceUpdateItem] = Field(..., min_length=1, max_length=5000)

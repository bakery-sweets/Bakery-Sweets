from typing import Optional, List
from datetime import datetime
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
    # Giá bán thực tế (đã trừ ưu đãi sản phẩm nếu có)
    price: Decimal
    stock_quantity: int
    stock_display: str = ""
    # Đang khuyến mãi: giá niêm yết, % giảm và thời điểm kết thúc (không có lý do khuyến mãi)
    original_price: Optional[Decimal] = None
    discount_percentage: Optional[Decimal] = None
    promo_end_date: Optional[datetime] = None

class ClientProductOut(BaseModel):
    product_id: int
    product_name: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    status: str
    ingredients: Optional[str] = None
    expiration_date: Optional[str] = None
    storage_instructions: Optional[str] = None
    image: Optional[str] = None
    min_price: Optional[Decimal] = None
    # Giá niêm yết của size rẻ nhất khi size đó đang được giảm (để gạch giá trên thẻ sản phẩm)
    min_original_price: Optional[Decimal] = None
    # Mức giảm cao nhất trong các size (để gắn nhãn khuyến mãi trên thẻ bánh)
    max_discount_percentage: Optional[Decimal] = None
    promo_end_date: Optional[datetime] = None
    stock_quantity: int = 0
    stock_display: str = ""
    created_at: Optional[datetime] = None
    sizes: List[ClientProductSizeOut] = []

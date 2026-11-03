from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel, Field

T = TypeVar("T")

class ResponseBase(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Thành công"
    data: Optional[T] = None

class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Trang hiện tại")
    page_size: int = Field(default=10, ge=1, le=100, description="Số lượng mục trên 1 trang")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int

class ExcelRowError(BaseModel):
    """Lỗi của một ô / dòng khi đọc file Excel nhập liệu hàng loạt"""
    row: int = Field(..., description="Số dòng trên Excel")
    column: Optional[str] = Field(None, description="Tên cột bị lỗi")
    message: str

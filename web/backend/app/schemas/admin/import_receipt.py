from typing import Optional, List, Literal
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal

class SupplierOut(BaseModel):
    supplier_id: int
    supplier_code: str
    supplier_name: str
    contact_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    status: str

class ImportDetailInput(BaseModel):
    product_id: int
    size_id: int
    quantity: int = Field(..., gt=0)
    import_price: Decimal = Field(..., ge=0)
    note: Optional[str] = None

class ImportReceiptCreate(BaseModel):
    supplier_id: int
    import_date: Optional[datetime] = None
    notes: Optional[str] = None
    # Pending: lưu phiếu tạm, Completed: nhập kho ngay (cộng tồn kho)
    status: Literal["Pending", "Completed"] = "Pending"
    details: List[ImportDetailInput] = Field(..., min_length=1)

class ImportReceiptStatusUpdate(BaseModel):
    status: Literal["Completed", "Cancelled"]

class ImportDetailOut(BaseModel):
    product_id: int
    product_name: str
    size_id: int
    size_name: str
    quantity: int
    import_price: Decimal
    total_price: Decimal
    note: Optional[str] = None

class ImportReceiptOut(BaseModel):
    import_id: int
    import_code: str
    supplier_id: int
    supplier_code: str
    supplier_name: str
    total_amount: Decimal
    total_quantity: int
    import_date: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    details: List[ImportDetailOut] = []

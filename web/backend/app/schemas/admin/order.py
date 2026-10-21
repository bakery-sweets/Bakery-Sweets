from typing import Optional, List, Literal
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

class AdminOrderDetailOut(BaseModel):
    product_id: int
    product_name: str
    size_id: int
    size_name: str
    quantity: int
    price: Decimal
    total_price: Decimal
    note: Optional[str] = None

class AdminOrderStatusLogOut(BaseModel):
    log_id: int
    old_status: Optional[str] = None
    new_status: str
    changed_by: Optional[str] = None
    note: Optional[str] = None
    changed_at: Optional[datetime] = None

class AdminOrderOut(BaseModel):
    order_id: int
    order_code: Optional[str] = None
    customer_id: int
    recipient_name: str
    recipient_phone: str
    pickup_time: Optional[datetime] = None
    notes: Optional[str] = None
    total_quantity: int
    total_cost: Decimal
    discount_amount: Decimal
    final_cost: Decimal
    status: str
    payment_method: str
    payment_status: str
    order_date: datetime
    details: List[AdminOrderDetailOut] = []
    status_logs: List[AdminOrderStatusLogOut] = []
    # Các trạng thái admin được phép chuyển tới từ trạng thái hiện tại
    next_statuses: List[str] = []

class AdminOrderStatusUpdate(BaseModel):
    status: Literal["Pending", "Processing", "Ready", "Completed", "Cancelled"]
    note: Optional[str] = None

class AdminOrderPaymentConfirm(BaseModel):
    note: Optional[str] = None

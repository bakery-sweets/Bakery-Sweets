import re
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError
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
    promotion_id: Optional[int] = None
    promotion_code: Optional[str] = None
    promotion_name: Optional[str] = None
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


# ===== Nhân viên & admin tạo đơn: khách gọi điện đặt bánh, hoặc bán tại quầy =====

PHONE_PATTERN = re.compile(r"^0\d{9}$")
NOTES_MAX_LENGTH = 200

# Loại đơn:
#  - "phone":     khách gọi điện, nhân viên đặt hộ & đã chốt với khách -> vào thẳng "Processing", bắt buộc giờ hẹn
#  - "immediate": khách mua tại quầy, lấy bánh ngay -> "Completed" + "Paid"
#  - "preorder":  khách đặt tại quầy, hẹn giờ quay lại lấy -> "Pending"
ORDER_TYPES = ("phone", "immediate", "preorder")
PICKUP_REQUIRED_TYPES = ("phone", "preorder")
# Phương thức cần khách có mặt để thu tiền: đơn qua điện thoại không thể đã thanh toán bằng các cách này
IN_PERSON_PAYMENT_METHODS = ("COD", "Credit Card")

class AdminOrderItemCreate(BaseModel):
    product_id: int
    size_id: int
    quantity: int = Field(..., gt=0, le=999)
    # Đơn giá nhân viên đang thấy trên màn hình; server đối chiếu với giá hiện hành để báo khi giá vừa đổi
    price: Decimal = Field(..., ge=0)

class AdminOrderCreate(BaseModel):
    recipient_name: str = Field(..., max_length=100)
    recipient_phone: str
    order_type: Literal["phone", "immediate", "preorder"] = "phone"
    pickup_time: Optional[datetime] = None
    notes: Optional[str] = None
    payment_method: Literal["COD", "Banking", "Momo", "Credit Card", "VNPay"] = "COD"
    payment_status: Literal["Paid", "Unpaid"] = "Unpaid"
    voucher_code: Optional[str] = None
    items: List[AdminOrderItemCreate] = Field(..., min_length=1)

    @field_validator("recipient_phone", mode="before")
    @classmethod
    def validate_phone(cls, v):
        phone = re.sub(r"\s+", "", str(v or ""))
        if not PHONE_PATTERN.match(phone):
            raise PydanticCustomError("phone_format", "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0")
        return phone

    @field_validator("recipient_name", mode="before")
    @classmethod
    def validate_name(cls, v):
        name = " ".join(str(v or "").split())
        if not name:
            raise PydanticCustomError("name_required", "Vui lòng nhập tên khách hàng")
        return name

    @field_validator("notes", "voucher_code", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        if v is None:
            return None
        v = str(v).strip()
        return v or None

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > NOTES_MAX_LENGTH:
            raise PydanticCustomError("notes_too_long", f"Ghi chú không được vượt quá {NOTES_MAX_LENGTH} ký tự")
        return v

    @model_validator(mode="after")
    def check_order_rules(self):
        if self.order_type in PICKUP_REQUIRED_TYPES and self.pickup_time is None:
            raise PydanticCustomError("pickup_required", "Đơn đặt trước cần chọn giờ hẹn lấy bánh")
        if (
            self.order_type == "phone"
            and self.payment_status == "Paid"
            and self.payment_method in IN_PERSON_PAYMENT_METHODS
        ):
            raise PydanticCustomError(
                "phone_paid_in_person",
                "Đơn qua điện thoại chỉ ghi nhận đã thanh toán trước khi khách chuyển khoản hoặc trả qua ví; "
                "tiền mặt / quẹt thẻ sẽ thu khi khách đến nhận bánh",
            )
        return self

class AdminCustomerLookupOut(BaseModel):
    found: bool
    customer_id: Optional[int] = None
    recipient_name: Optional[str] = None
    phone: str
    # Khách tự đăng ký tài khoản (sẽ nhận thông báo đơn trên App / Web); False = hồ sơ do nhân viên tạo
    has_account: bool = False
    # Cảnh báo cho nhân viên khi nhận đơn qua điện thoại
    is_locked: bool = False
    lock_reason: Optional[str] = None
    order_count: int = 0
    cancelled_count: int = 0
    # Đơn chưa xong (Chờ tiếp nhận / Đang chuẩn bị / Sẵn sàng): khách có thể đang gọi để hỏi / sửa đơn cũ
    active_order_count: int = 0

class AdminVoucherCheckIn(BaseModel):
    voucher_code: str = Field(..., min_length=1)
    order_amount: Decimal = Field(..., ge=0)
    # SĐT khách để kiểm tra giới hạn lượt dùng mã theo từng khách
    recipient_phone: Optional[str] = None

class AdminVoucherCheckOut(BaseModel):
    promotion_id: int
    promotion_code: str
    promotion_name: str
    discount_amount: Decimal
    final_amount: Decimal

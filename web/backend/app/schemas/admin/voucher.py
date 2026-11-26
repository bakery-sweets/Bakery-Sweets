from typing import Optional, List, Literal
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError

VN_TZ = timezone(timedelta(hours=7))


def _local_naive(v: Optional[datetime]) -> Optional[datetime]:
    """DB lưu giờ Việt Nam không kèm múi giờ: đổi thời điểm có múi giờ (VD: ...Z) về giờ VN."""
    if v is not None and v.tzinfo is not None:
        return v.astimezone(VN_TZ).replace(tzinfo=None)
    return v


# ===== Mã giảm giá dùng 1 lần (single_use_vouchers) =====

class SingleUseVoucherGenerate(BaseModel):
    # Số mã sinh ra trong một đợt
    quantity: int = Field(..., ge=1, le=500)
    discount_type: Literal["percent", "fixed"] = "percent"
    discount_value: Decimal = Field(..., gt=0)
    # Chỉ dùng với percent; None: không giới hạn
    max_discount_value: Optional[Decimal] = Field(None, gt=0)
    min_order_value: Decimal = Field(Decimal("0"), ge=0)
    # None: không hết hạn
    expires_at: Optional[datetime] = None
    batch_name: Optional[str] = Field(None, max_length=255)

    _normalize_expires = field_validator("expires_at")(classmethod(lambda cls, v: _local_naive(v)))

    @field_validator("batch_name", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v.strip() if isinstance(v, str) else v

    @model_validator(mode="after")
    def check_rules(self):
        if self.discount_type == "percent":
            if self.discount_value > 100:
                raise PydanticCustomError("percent_too_high", "Phần trăm giảm không được vượt quá 100%")
        else:
            # Giảm số tiền cố định: mức trần không có ý nghĩa
            self.max_discount_value = None
        if self.expires_at is not None and self.expires_at <= datetime.now():
            raise PydanticCustomError("expires_in_past", "Ngày hết hạn phải sau thời điểm hiện tại")
        return self


class SingleUseVoucherStatusUpdate(BaseModel):
    # Mã đã dùng không đổi được trạng thái; chỉ bật / tắt mã chưa dùng
    status: Literal["Unused", "Disabled"]


class SingleUseVoucherOut(BaseModel):
    voucher_id: int
    code: str
    discount_type: str
    discount_value: Decimal
    max_discount_value: Optional[Decimal] = None
    min_order_value: Decimal
    expires_at: Optional[datetime] = None
    # Unused | Used | Disabled; is_expired: chưa dùng nhưng đã quá hạn
    status: str
    is_expired: bool = False
    batch_name: Optional[str] = None
    description: str = ""
    used_at: Optional[datetime] = None
    used_order_id: Optional[int] = None
    used_order_code: Optional[str] = None
    used_by_name: Optional[str] = None
    used_by_phone: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None


class SingleUseVoucherGenerateOut(BaseModel):
    vouchers: List[SingleUseVoucherOut]


# ===== Khuyến mãi theo sản phẩm (product_promotions) =====

class ProductPromotionInput(BaseModel):
    product_id: int
    # None: mọi size của sản phẩm
    size_id: Optional[int] = None
    discount_percentage: Decimal = Field(..., gt=0, le=90)
    start_date: datetime
    end_date: datetime
    status: Literal["Active", "Paused"] = "Active"
    # Ghi chú nội bộ (lý do khuyến mãi), không hiển thị cho khách
    note: Optional[str] = Field(None, max_length=255)

    _normalize_dates = field_validator("start_date", "end_date")(classmethod(lambda cls, v: _local_naive(v)))

    @field_validator("note", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v.strip() if isinstance(v, str) else v

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date <= self.start_date:
            raise PydanticCustomError("end_before_start", "Thời điểm kết thúc phải sau thời điểm bắt đầu")
        return self


class ProductPromotionStatusUpdate(BaseModel):
    status: Literal["Active", "Paused"]


class ProductPromotionOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    image: Optional[str] = None
    size_id: Optional[int] = None
    size_name: Optional[str] = None
    discount_percentage: Decimal
    start_date: datetime
    end_date: datetime
    status: str
    # Running (đang áp dụng) | Upcoming (chưa tới) | Ended (đã kết thúc) | Paused (tạm dừng)
    state: str
    note: Optional[str] = None
    # Giá niêm yết -> giá sau giảm của từng size được áp dụng
    prices: List[dict] = []
    created_at: Optional[datetime] = None

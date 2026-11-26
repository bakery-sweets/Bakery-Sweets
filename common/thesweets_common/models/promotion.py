from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Numeric, CHAR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from thesweets_common.models.base import Base

PROMO_STATUSES = ("Draft", "Active", "Paused", "Expired")
PRODUCT_PROMO_STATUSES = ("Active", "Paused")
VOUCHER_DISCOUNT_TYPES = ("percent", "fixed")
VOUCHER_STATUSES = ("Unused", "Used", "Disabled")

class Promotion(Base):
    __tablename__ = "promotions"

    promotion_id = Column(Integer, primary_key=True, autoincrement=True)
    promotion_code = Column(String(50), unique=True, nullable=False)
    promotion_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(SQLEnum(*PROMO_STATUSES, name="promo_status"), default="Active")
    usage_limit_per_user = Column(Integer, default=1, nullable=True)
    total_usage_limit = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    invoice_promotions = relationship("InvoicePromotion", back_populates="promotion", cascade="all, delete-orphan")


class InvoicePromotion(Base):
    __tablename__ = "invoice_promotions"

    promotion_id = Column(Integer, ForeignKey("promotions.promotion_id", ondelete="CASCADE"), primary_key=True)
    min_order_value = Column(Numeric(15, 2), primary_key=True)
    discount_percentage = Column(Numeric(5, 2), nullable=False)
    max_discount_value = Column(Numeric(15, 2), nullable=True)

    promotion = relationship("Promotion", back_populates="invoice_promotions")


class OrderPromotion(Base):
    __tablename__ = "order_promotions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False)
    promotion_id = Column(Integer, ForeignKey("promotions.promotion_id", ondelete="CASCADE"), nullable=False)
    discount_amount = Column(Numeric(15, 2), default=0, nullable=False)
    applied_at = Column(DateTime, server_default=func.now())

    order = relationship("Order", back_populates="applied_promotions")
    promotion = relationship("Promotion")


class ProductPromotion(Base):
    """Khuyến mãi giảm giá trực tiếp trên sản phẩm. size_id NULL: áp dụng mọi size.
    Khách chỉ thấy mức giảm; lý do khuyến mãi (VD: mẻ bánh sắp hết hạn) ghi ở note, chỉ admin xem."""
    __tablename__ = "product_promotions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("product.product_id", ondelete="CASCADE"), nullable=False)
    size_id = Column(Integer, ForeignKey("size.size_id", ondelete="CASCADE"), nullable=True)
    discount_percentage = Column(Numeric(5, 2), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(SQLEnum(*PRODUCT_PROMO_STATUSES, name="product_promo_status"), default="Active")
    note = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    product = relationship("Product")
    size = relationship("Size")


class SingleUseVoucher(Base):
    """Mã giảm giá ngẫu nhiên 8 ký tự, mỗi mã chỉ dùng 1 lần (đơn bị hủy thì mã được trả lại)."""
    __tablename__ = "single_use_vouchers"

    voucher_id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(CHAR(8), unique=True, nullable=False)
    discount_type = Column(SQLEnum(*VOUCHER_DISCOUNT_TYPES, name="voucher_discount_type"), nullable=False, default="percent")
    discount_value = Column(Numeric(15, 2), nullable=False)
    max_discount_value = Column(Numeric(15, 2), nullable=True)
    min_order_value = Column(Numeric(15, 2), nullable=False, default=0)
    expires_at = Column(DateTime, nullable=True)
    status = Column(SQLEnum(*VOUCHER_STATUSES, name="voucher_status"), default="Unused")
    batch_name = Column(String(255), nullable=True)
    used_by_customer_id = Column(Integer, ForeignKey("customers.customer_id", ondelete="SET NULL"), nullable=True)
    used_order_id = Column(Integer, ForeignKey("orders.order_id", ondelete="SET NULL"), nullable=True)
    used_at = Column(DateTime, nullable=True)
    created_by = Column(String(20), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    used_by_customer = relationship("Customer")
    used_order = relationship("Order", back_populates="single_use_voucher")


class CustomerSavedVoucher(Base):
    """Ví voucher: mã dùng 1 lần khách đã đăng nhập nhập vào và được lưu lại để dùng sau."""
    __tablename__ = "customer_saved_vouchers"

    customer_id = Column(Integer, ForeignKey("customers.customer_id", ondelete="CASCADE"), primary_key=True)
    voucher_id = Column(Integer, ForeignKey("single_use_vouchers.voucher_id", ondelete="CASCADE"), primary_key=True)
    saved_at = Column(DateTime, server_default=func.now())

    voucher = relationship("SingleUseVoucher")

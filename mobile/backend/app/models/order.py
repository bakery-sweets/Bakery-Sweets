from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Numeric, Date, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.config.database import Base

class Cart(Base):
    __tablename__ = "cart"

    cart_id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("product.product_id", ondelete="CASCADE"), nullable=False)
    size_id = Column(Integer, ForeignKey("size.size_id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    added_at = Column(DateTime, server_default=func.now())

    customer = relationship("Customer", back_populates="cart_items")
    product = relationship("Product")
    size = relationship("Size")


class Order(Base):
    __tablename__ = "orders"

    order_id = Column(Integer, primary_key=True, autoincrement=True)
    order_code = Column(String(20), unique=True, nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    shipper_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    recipient_name = Column(String(100), nullable=False)
    recipient_phone = Column(String(20), nullable=False)
    shipping_address = Column(String(255), nullable=False)
    shipping_city = Column(String(100), nullable=True)
    shipping_district = Column(String(100), nullable=True)
    shipping_ward = Column(String(100), nullable=True)
    delivery_date = Column(Date, nullable=True)
    delivery_time = Column(Time, nullable=True)
    shipping_fee = Column(Numeric(10, 2), default=0)
    notes = Column(Text, nullable=True)
    promotion_id = Column(Integer, ForeignKey("promotions.promotion_id", ondelete="SET NULL"), nullable=True)
    discount_amount = Column(Numeric(15, 2), default=0)
    total_quantity = Column(Integer, default=1, nullable=False)
    total_cost = Column(Numeric(20, 2), default=0, nullable=False)
    final_cost = Column(Numeric(20, 2), default=0, nullable=False)
    payment_method = Column(SQLEnum("COD", "Momo", "Credit Card", "VNPay", name="payment_method"), default="COD")
    payment_status = Column(SQLEnum("Unpaid", "Paid", "Refunded", name="payment_status"), default="Unpaid")
    status = Column(SQLEnum("Pending", "Processing", "Shipping", "Completed", "Cancelled", name="order_status"), default="Pending")
    order_date = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    customer = relationship("Customer", back_populates="orders")
    employee = relationship("Employee", foreign_keys=[employee_id])
    shipper = relationship("Employee", foreign_keys=[shipper_id])
    promotion = relationship("Promotion")
    details = relationship("OrderDetail", back_populates="order", cascade="all, delete-orphan")
    status_logs = relationship("OrderStatusLog", back_populates="order", cascade="all, delete-orphan")
    promotions_applied = relationship("OrderPromotion", back_populates="order", cascade="all, delete-orphan")


class OrderDetail(Base):
    __tablename__ = "order_detail"

    order_id = Column(Integer, ForeignKey("orders.order_id", ondelete="CASCADE"), primary_key=True)
    product_id = Column(Integer, ForeignKey("product.product_id", ondelete="CASCADE"), primary_key=True)
    size_id = Column(Integer, ForeignKey("size.size_id", ondelete="CASCADE"), primary_key=True)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(15, 2), nullable=False)
    note = Column(Text, nullable=True)

    order = relationship("Order", back_populates="details")
    product = relationship("Product")
    size = relationship("Size")


class OrderPromotion(Base):
    __tablename__ = "order_promotions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False)
    promotion_id = Column(Integer, ForeignKey("promotions.promotion_id", ondelete="CASCADE"), nullable=False)
    discount_amount = Column(Numeric(15, 2), default=0, nullable=False)
    applied_at = Column(DateTime, server_default=func.now())

    order = relationship("Order", back_populates="promotions_applied")
    promotion = relationship("Promotion")


class OrderStatusLog(Base):
    __tablename__ = "order_status_logs"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    old_status = Column(SQLEnum("Pending", "Processing", "Shipping", "Completed", "Cancelled", name="order_status_old"), nullable=True)
    new_status = Column(SQLEnum("Pending", "Processing", "Shipping", "Completed", "Cancelled", name="order_status_new"), nullable=False)
    note = Column(Text, nullable=True)
    changed_at = Column(DateTime, server_default=func.now())

    order = relationship("Order", back_populates="status_logs")
    employee = relationship("Employee")

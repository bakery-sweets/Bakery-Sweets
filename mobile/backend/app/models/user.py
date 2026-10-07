from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.config.database import Base

class User(Base):
    __tablename__ = "users"

    user_name = Column(String(255), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(SQLEnum("customer", "admin", name="user_roles"), default="customer")
    status = Column(SQLEnum("active", "locked", name="user_status"), default="active")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    customer = relationship("Customer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column(Integer, primary_key=True, autoincrement=True)
    user_name = Column(String(255), ForeignKey("users.user_name", ondelete="CASCADE"), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), unique=True, nullable=True)
    gender = Column(SQLEnum("Male", "Female", "Other", name="customer_gender"), default="Other")
    loyalty_points = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="customer")
    cart_items = relationship("Cart", back_populates="customer", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")

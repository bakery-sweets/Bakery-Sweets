from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.config.database import Base

class User(Base):
    __tablename__ = "users"

    user_name = Column(String(255), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(SQLEnum("customer", "staff", "admin", name="user_roles"), default="customer")
    status = Column(SQLEnum("active", "locked", name="user_status"), default="active")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    customer = relationship("Customer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    employee = relationship("Employee", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column(Integer, primary_key=True, autoincrement=True)
    user_name = Column(String(255), ForeignKey("users.user_name", ondelete="CASCADE"), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), unique=True, nullable=True)
    gender = Column(SQLEnum("Male", "Female", "Other", name="customer_gender"), default="Other")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="customer")
    cart_items = relationship("Cart", back_populates="customer", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")


class Department(Base):
    __tablename__ = "departments"

    department_id = Column(Integer, primary_key=True, autoincrement=True)
    department_name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    employees = relationship("Employee", back_populates="department")


class Employee(Base):
    __tablename__ = "employees"

    employee_id = Column(Integer, primary_key=True, autoincrement=True)
    employee_code = Column(String(20), unique=True, nullable=False)
    user_name = Column(String(255), ForeignKey("users.user_name", ondelete="SET NULL"), unique=True, nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), unique=True, nullable=True)
    citizen_id = Column(String(20), unique=True, nullable=True)
    gender = Column(SQLEnum("Male", "Female", "Other", name="emp_gender"), default="Male")
    date_of_birth = Column(Date, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.department_id", ondelete="SET NULL"), nullable=True)
    position = Column(String(100), nullable=True)
    hire_date = Column(Date, nullable=False)
    contract_type = Column(SQLEnum("Full-time", "Part-time", "Probation", name="contract_type"), default="Full-time")
    status = Column(SQLEnum("Active", "On Leave", "Resigned", name="emp_status"), default="Active")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="employee")
    department = relationship("Department", back_populates="employees")

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Numeric, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.config.database import Base

class Category(Base):
    __tablename__ = "category"

    category_id = Column(Integer, primary_key=True, autoincrement=True)
    category_name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    products = relationship("Product", back_populates="category")


class Size(Base):
    __tablename__ = "size"

    size_id = Column(Integer, primary_key=True, autoincrement=True)
    size_name = Column(String(50), unique=True, nullable=False)

    product_sizes = relationship("ProductSize", back_populates="size")


class Product(Base):
    __tablename__ = "product"

    product_id = Column(Integer, primary_key=True, autoincrement=True)
    product_name = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey("category.category_id", ondelete="SET NULL"), nullable=True)
    status = Column(SQLEnum("Available", "Out of Stock", "Discontinued", "Hidden", name="product_status"), default="Available")
    ingredients = Column(Text, nullable=True)
    expiration_date = Column(Text, nullable=True)
    storage_instructions = Column(Text, nullable=True)
    image = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    category = relationship("Category", back_populates="products")
    sizes = relationship("ProductSize", back_populates="product", cascade="all, delete-orphan")


class ProductSize(Base):
    __tablename__ = "product_sizes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("product.product_id", ondelete="CASCADE"), nullable=False)
    size_id = Column(Integer, ForeignKey("size.size_id", ondelete="CASCADE"), nullable=False)
    price = Column(Numeric(15, 2), nullable=False)
    stock_quantity = Column(Integer, default=0, nullable=False)

    __table_args__ = (
        UniqueConstraint("product_id", "size_id", name="unique_product_size"),
    )

    product = relationship("Product", back_populates="sizes")
    size = relationship("Size", back_populates="product_sizes")

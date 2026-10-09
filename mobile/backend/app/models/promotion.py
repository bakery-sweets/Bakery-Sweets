from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.config.database import Base

class Promotion(Base):
    __tablename__ = "promotions"

    promotion_id = Column(Integer, primary_key=True, autoincrement=True)
    promotion_code = Column(String(50), unique=True, nullable=False)
    promotion_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(SQLEnum("Draft", "Active", "Paused", "Expired", name="promo_status"), default="Active")
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

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from thesweets_common.models.base import Base

IMPORT_STATUSES = ("Pending", "Completed", "Cancelled")

class Supplier(Base):
    __tablename__ = "suppliers"

    supplier_id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_code = Column(String(20), unique=True, nullable=False)
    supplier_name = Column(String(255), nullable=False)
    contact_name = Column(String(100), nullable=True)
    phone = Column(String(20), unique=True, nullable=False)
    email = Column(String(255), nullable=True)
    address = Column(String(255), nullable=True)
    status = Column(SQLEnum("Active", "Inactive", name="supplier_status"), default="Active")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ImportReceipt(Base):
    __tablename__ = "import_receipts"

    import_id = Column(Integer, primary_key=True, autoincrement=True)
    import_code = Column(String(20), unique=True, nullable=False)
    # RESTRICT: không cho xóa nhà cung cấp đã có phiếu nhập
    supplier_id = Column(Integer, ForeignKey("suppliers.supplier_id", ondelete="RESTRICT"), nullable=False)
    total_amount = Column(Numeric(20, 2), default=0, nullable=False)
    import_date = Column(DateTime, server_default=func.now())
    status = Column(SQLEnum(*IMPORT_STATUSES, name="import_status"), default="Completed")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    supplier = relationship("Supplier")
    details = relationship("ImportReceiptDetail", back_populates="receipt", cascade="all, delete-orphan")


class ImportReceiptDetail(Base):
    __tablename__ = "import_receipt_details"

    import_id = Column(Integer, ForeignKey("import_receipts.import_id", ondelete="CASCADE"), primary_key=True)
    product_id = Column(Integer, ForeignKey("product.product_id", ondelete="CASCADE"), primary_key=True)
    size_id = Column(Integer, ForeignKey("size.size_id", ondelete="CASCADE"), primary_key=True)
    quantity = Column(Integer, nullable=False)
    import_price = Column(Numeric(15, 2), nullable=False)
    # Thành tiền = quantity * import_price
    total_price = Column(Numeric(20, 2), nullable=False)
    note = Column(Text, nullable=True)

    receipt = relationship("ImportReceipt", back_populates="details")
    product = relationship("Product")
    size = relationship("Size")

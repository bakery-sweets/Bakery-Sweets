from typing import List, Optional
from sqlalchemy.orm import Session
from thesweets_common.models.product import Product, ProductSize, Category
from thesweets_common.models.order import Cart
from app.schemas.admin.product import ProductCreate, ProductUpdate

class AdminProductService:
    @staticmethod
    def get_all(db: Session, category_id: Optional[int] = None, search: Optional[str] = None) -> List[Product]:
        query = db.query(Product)
        if category_id:
            query = query.filter(Product.category_id == category_id)
        if search:
            query = query.filter(Product.product_name.ilike(f"%{search}%"))
        return query.order_by(Product.product_id.desc()).all()

    @staticmethod
    def get_by_id(db: Session, product_id: int) -> Optional[Product]:
        return db.query(Product).filter(Product.product_id == product_id).first()

    @staticmethod
    def create(db: Session, data: ProductCreate) -> Product:
        product = Product(
            product_name=data.product_name,
            category_id=data.category_id,
            status=data.status,
            ingredients=data.ingredients,
            expiration_date=data.expiration_date,
            storage_instructions=data.storage_instructions,
            image=data.image,
        )
        db.add(product)
        db.flush()

        for s in data.sizes:
            ps = ProductSize(
                product_id=product.product_id,
                size_id=s.size_id,
                price=s.price,
                stock_quantity=s.stock_quantity,
            )
            db.add(ps)

        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def update(db: Session, product_id: int, data: ProductUpdate) -> Optional[Product]:
        product = db.query(Product).filter(Product.product_id == product_id).first()
        if not product:
            return None

        update_dict = data.model_dump(exclude_unset=True, exclude={"sizes"})
        for key, value in update_dict.items():
            setattr(product, key, value)

        if data.sizes is not None:
            db.query(ProductSize).filter(ProductSize.product_id == product_id).delete()
            for s in data.sizes:
                ps = ProductSize(
                    product_id=product.product_id,
                    size_id=s.size_id,
                    price=s.price,
                    stock_quantity=s.stock_quantity,
                )
                db.add(ps)

        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def delete(db: Session, product_id: int) -> bool:
        # Xóa mềm: chuyển sang ngừng kinh doanh để giữ nguyên lịch sử đơn hàng (order_detail)
        product = db.query(Product).filter(Product.product_id == product_id).first()
        if not product:
            return False
        product.status = "Discontinued"
        db.query(Cart).filter(Cart.product_id == product_id).delete()
        db.commit()
        return True

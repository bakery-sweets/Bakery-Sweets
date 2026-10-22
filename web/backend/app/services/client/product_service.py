from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.product import Product, ProductSize, Category

class ClientProductService:
    @staticmethod
    def get_products(db: Session, category_name: Optional[str] = None, search: Optional[str] = None) -> List[Product]:
        query = (
            db.query(Product)
            .options(joinedload(Product.sizes).joinedload(ProductSize.size), joinedload(Product.category))
            .filter(Product.status == "Available")
        )
        if category_name and str(category_name).strip().upper() != "ALL":
            cat_str = str(category_name).strip()
            if cat_str.isdigit():
                query = query.filter(Product.category_id == int(cat_str))
            else:
                query = query.join(Product.category).filter(Category.category_name.ilike(f"%{cat_str}%"))
        if search and search.strip():
            query = query.filter(Product.product_name.ilike(f"%{search.strip()}%"))
        return query.order_by(Product.product_id.asc()).all()

    @staticmethod
    def get_by_id(db: Session, product_id: int) -> Optional[Product]:
        return (
            db.query(Product)
            .options(joinedload(Product.sizes).joinedload(ProductSize.size), joinedload(Product.category))
            .filter(Product.product_id == product_id, Product.status == "Available")
            .first()
        )

    @staticmethod
    def get_categories(db: Session) -> List[Category]:
        return db.query(Category).order_by(Category.category_id.asc()).all()

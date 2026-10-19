from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.product import Product, ProductSize, Category

class ClientProductService:
    @staticmethod
    def get_products(db: Session, category_name: Optional[str] = None, search: Optional[str] = None) -> List[Product]:
        query = db.query(Product).filter(Product.status == "Available")
        if category_name and category_name.upper() != "ALL":
            query = query.join(Product.category).filter(Category.category_name.ilike(f"%{category_name}%"))
        if search:
            query = query.filter(Product.product_name.ilike(f"%{search}%"))
        return query.all()

    @staticmethod
    def get_by_id(db: Session, product_id: int) -> Optional[Product]:
        return db.query(Product).filter(Product.product_id == product_id, Product.status == "Available").first()

    @staticmethod
    def get_categories(db: Session) -> List[Category]:
        return db.query(Category).all()

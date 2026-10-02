from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.config.database import get_db
from app.models.product import Product, Category, Size, ProductSize
from app.schemas.product import ProductOut, CategoryOut, SizeOut, ProductSizeOut

router = APIRouter()

@router.get("/categories", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

@router.get("/sizes", response_model=List[SizeOut])
def get_sizes(db: Session = Depends(get_db)):
    return db.query(Size).all()

@router.get("/products", response_model=List[ProductOut])
def get_products(
    category_id: Optional[int] = None,
    keyword: Optional[str] = None,
    status: Optional[str] = "Available",
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.sizes).joinedload(ProductSize.size)
    )

    if category_id:
        query = query.filter(Product.category_id == category_id)

    if status and status != "All":
        query = query.filter(Product.status == status)

    if keyword:
        term = f"%{keyword}%"
        query = query.filter(Product.product_name.ilike(term))

    products = query.offset(skip).limit(limit).all()

    result = []
    for p in products:
        size_list = []
        for ps in p.sizes:
            size_list.append(ProductSizeOut(
                id=ps.id,
                size_id=ps.size_id,
                size_name=ps.size.size_name if ps.size else "",
                price=ps.price,
                stock_quantity=ps.stock_quantity,
            ))
        result.append(ProductOut(
            product_id=p.product_id,
            product_name=p.product_name,
            category_id=p.category_id,
            category_name=p.category.category_name if p.category else None,
            status=p.status,
            ingredients=p.ingredients,
            expiration_date=p.expiration_date,
            storage_instructions=p.storage_instructions,
            image=p.image,
            sizes=size_list,
        ))

    return result

@router.get("/products/{product_id}", response_model=ProductOut)
def get_product_detail(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.sizes).joinedload(ProductSize.size)
    ).filter(Product.product_id == product_id).first()

    if not p:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm bánh này")

    size_list = []
    for ps in p.sizes:
        size_list.append(ProductSizeOut(
            id=ps.id,
            size_id=ps.size_id,
            size_name=ps.size.size_name if ps.size else "",
            price=ps.price,
            stock_quantity=ps.stock_quantity,
        ))

    return ProductOut(
        product_id=p.product_id,
        product_name=p.product_name,
        category_id=p.category_id,
        category_name=p.category.category_name if p.category else None,
        status=p.status,
        ingredients=p.ingredients,
        expiration_date=p.expiration_date,
        storage_instructions=p.storage_instructions,
        image=p.image,
        sizes=size_list,
    )

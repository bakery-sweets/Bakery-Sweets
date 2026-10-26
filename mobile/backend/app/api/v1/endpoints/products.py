from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db
from app.schemas.product import ProductOut, CategoryOut, SizeOut
from app.services.product_service import ProductService

router = APIRouter()

@router.get("/categories", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return ProductService.get_categories(db)

@router.get("/sizes", response_model=List[SizeOut])
def get_sizes(db: Session = Depends(get_db)):
    return ProductService.get_sizes(db)

@router.get("/products", response_model=List[ProductOut])
def get_products(
    category_id: Optional[int] = None,
    keyword: Optional[str] = None,
    status: Optional[str] = "Available",
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return ProductService.get_products(db, category_id, keyword, status, skip, limit)

@router.get("/products/{product_id}", response_model=ProductOut)
def get_product_detail(product_id: int, db: Session = Depends(get_db)):
    return ProductService.get_product_detail(db, product_id)

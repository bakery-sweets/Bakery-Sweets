from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.services.client.product_service import ClientProductService
from app.schemas.client.product import (
    ClientProductOut,
    ClientProductSizeOut,
    ClientCategoryOut,
)
from app.schemas.common import ResponseBase

router = APIRouter()

def _to_client_product_out(p) -> ClientProductOut:
    sizes_out = [
        ClientProductSizeOut(
            id=s.id,
            size_id=s.size_id,
            size_name=s.size.size_name if s.size else "",
            price=s.price,
            stock_quantity=s.stock_quantity,
        )
        for s in sorted(p.sizes, key=lambda x: x.price)
    ]
    min_price = sizes_out[0].price if sizes_out else Decimal("0.00")

    return ClientProductOut(
        product_id=p.product_id,
        product_name=p.product_name,
        category_id=p.category_id,
        category_name=p.category.category_name if p.category else None,
        status=p.status,
        ingredients=p.ingredients,
        expiration_date=p.expiration_date,
        storage_instructions=p.storage_instructions,
        image=p.image,
        min_price=min_price,
        sizes=sizes_out,
    )

@router.get("", response_model=ResponseBase[List[ClientProductOut]], summary="Xem danh sách bánh")
def list_products(
    category: Optional[str] = Query(None, description="Tên danh mục hoặc ALL"),
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm"),
    db: Session = Depends(get_db),
):
    products = ClientProductService.get_products(db, category_name=category, search=search)
    return ResponseBase(data=[_to_client_product_out(p) for p in products])

@router.get("/categories", response_model=ResponseBase[List[ClientCategoryOut]], summary="Lấy danh mục bánh")
def list_categories(db: Session = Depends(get_db)):
    cats = ClientProductService.get_categories(db)
    out = [
        ClientCategoryOut(
            category_id=c.category_id,
            category_name=c.category_name,
            description=c.description,
        )
        for c in cats
    ]
    return ResponseBase(data=out)

@router.get("/{product_id}", response_model=ResponseBase[ClientProductOut], summary="Xem chi tiết một món bánh")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = ClientProductService.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy món bánh này")
    return ResponseBase(data=_to_client_product_out(product))

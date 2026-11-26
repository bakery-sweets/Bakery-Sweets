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
from thesweets_common.pricing import PriceBook

router = APIRouter()

def _size_out(s, q) -> ClientProductSizeOut:
    return ClientProductSizeOut(
        id=s.id,
        size_id=s.size_id,
        size_name=s.size.size_name if s.size else "",
        price=q.price,
        stock_quantity=s.stock_quantity,
        stock_display="20+" if s.stock_quantity > 20 else str(s.stock_quantity),
        original_price=q.original_price,
        discount_percentage=q.discount_percentage,
        promo_end_date=q.promo_end_date,
    )

def _to_client_product_out(p, book: PriceBook) -> ClientProductOut:
    # Giữ thứ tự size theo giá niêm yết (S, M, L...), giá hiển thị là giá sau ưu đãi
    sizes_out = [_size_out(s, book.quote_size(s)) for s in sorted(p.sizes, key=lambda x: x.price)]
    cheapest = min(sizes_out, key=lambda s: s.price, default=None)
    min_price = cheapest.price if cheapest else Decimal("0.00")
    best = max(
        (s for s in sizes_out if s.discount_percentage),
        key=lambda s: s.discount_percentage,
        default=None,
    )
    total_stock = sum(s.stock_quantity for s in p.sizes) if p.sizes else 0
    stock_display = "20+" if total_stock > 20 else str(total_stock)

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
        min_original_price=cheapest.original_price if cheapest else None,
        max_discount_percentage=best.discount_percentage if best else None,
        promo_end_date=best.promo_end_date if best else None,
        stock_quantity=total_stock,
        stock_display=stock_display,
        created_at=p.created_at,
        sizes=sizes_out,
    )

@router.get("", response_model=ResponseBase[List[ClientProductOut]], summary="Xem danh sách bánh")
def list_products(
    category: Optional[str] = Query(None, description="Tên danh mục hoặc ALL"),
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm"),
    db: Session = Depends(get_db),
):
    products = ClientProductService.get_products(db, category_name=category, search=search)
    return ResponseBase(data=_to_outs(db, products))

def _to_outs(db: Session, products) -> List[ClientProductOut]:
    book = PriceBook(db, [p.product_id for p in products])
    return [_to_client_product_out(p, book) for p in products]

@router.get("/deals", response_model=ResponseBase[List[ClientProductOut]], summary="Bánh đang khuyến mãi")
def list_deals(db: Session = Depends(get_db)):
    products = ClientProductService.get_products(db)
    outs = [o for o in _to_outs(db, products) if o.max_discount_percentage]
    # Mức giảm cao hơn lên trước
    outs.sort(key=lambda o: -(o.max_discount_percentage or 0))
    return ResponseBase(data=outs)

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

@router.get("/best-sellers", response_model=ResponseBase[List[ClientProductOut]], summary="Top bánh bán chạy nhất")
def list_best_sellers(limit: int = 4, db: Session = Depends(get_db)):
    products = ClientProductService.get_best_sellers(db, limit=limit)
    return ResponseBase(data=_to_outs(db, products))

@router.get("/{product_id}", response_model=ResponseBase[ClientProductOut], summary="Xem chi tiết một món bánh")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = ClientProductService.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy món bánh này")
    return ResponseBase(data=_to_outs(db, [product])[0])

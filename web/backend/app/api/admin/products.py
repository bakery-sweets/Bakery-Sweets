from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.models.user import User
from app.services.admin.product_service import AdminProductService
from app.schemas.admin.product import ProductCreate, ProductUpdate, AdminProductOut, ProductSizeOut
from app.schemas.common import ResponseBase

router = APIRouter()

def _to_product_out(p) -> AdminProductOut:
    sizes_out = [
        ProductSizeOut(
            id=s.id,
            size_id=s.size_id,
            size_name=s.size.size_name if s.size else None,
            price=s.price,
            stock_quantity=s.stock_quantity,
        )
        for s in p.sizes
    ]
    return AdminProductOut(
        product_id=p.product_id,
        product_name=p.product_name,
        category_id=p.category_id,
        category_name=p.category.category_name if p.category else None,
        status=p.status,
        ingredients=p.ingredients,
        expiration_date=p.expiration_date,
        storage_instructions=p.storage_instructions,
        image=p.image,
        sizes=sizes_out,
    )

@router.get("", response_model=ResponseBase[List[AdminProductOut]], summary="Lấy danh sách sản phẩm quản trị")
def list_products(
    category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    products = AdminProductService.get_all(db, category_id=category_id, search=search)
    return ResponseBase(data=[_to_product_out(p) for p in products])

@router.get("/{product_id}", response_model=ResponseBase[AdminProductOut], summary="Xem chi tiết sản phẩm")
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    product = AdminProductService.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return ResponseBase(data=_to_product_out(product))

@router.post("", response_model=ResponseBase[AdminProductOut], status_code=status.HTTP_201_CREATED, summary="Thêm sản phẩm mới")
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    product = AdminProductService.create(db, data)
    return ResponseBase(message="Thêm sản phẩm thành công", data=_to_product_out(product))

@router.put("/{product_id}", response_model=ResponseBase[AdminProductOut], summary="Cập nhật sản phẩm")
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    product = AdminProductService.update(db, product_id, data)
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm để cập nhật")
    return ResponseBase(message="Cập nhật sản phẩm thành công", data=_to_product_out(product))

@router.delete("/{product_id}", response_model=ResponseBase, summary="Xóa sản phẩm")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    success = AdminProductService.delete(db, product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm để xóa")
    return ResponseBase(message="Xóa sản phẩm thành công")

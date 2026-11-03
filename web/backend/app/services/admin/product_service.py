from typing import List, Optional, Set
from sqlalchemy import tuple_
from sqlalchemy.orm import Session, joinedload
from app.core.exceptions import BadRequestError
from thesweets_common.models.product import Product, ProductSize, Category
from thesweets_common.models.order import Cart
from app.schemas.admin.product import (
    ProductCreate,
    ProductUpdate,
    PriceChangeOut,
    PriceExcelPreviewOut,
    PriceUpdateItem,
)
from app.schemas.common import ExcelRowError
from app.services.excel_import import PRICE_TEMPLATE, finalize_errors, read_template

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

    # ===================== Biến thể bánh & cập nhật giá hàng loạt từ Excel =====================

    @staticmethod
    def active_variants(db: Session) -> List[ProductSize]:
        """Mọi cặp bánh - kích cỡ còn kinh doanh, dùng làm dữ liệu điền sẵn cho các file mẫu Excel"""
        return (
            db.query(ProductSize)
            .join(Product, Product.product_id == ProductSize.product_id)
            .filter(Product.status != "Discontinued")
            .options(joinedload(ProductSize.product).joinedload(Product.category), joinedload(ProductSize.size))
            .order_by(Product.product_name, Product.product_id, ProductSize.size_id)
            .all()
        )

    @staticmethod
    def price_template_rows(db: Session) -> List[list]:
        """Các dòng điền sẵn cho file mẫu, theo thứ tự cột của PRICE_TEMPLATE"""
        return [
            [
                ps.product_id,
                ps.product.product_name,
                ps.product.category.category_name if ps.product.category else "",
                ps.size_id,
                ps.size.size_name if ps.size else "",
                ps.price,
                None,
            ]
            for ps in AdminProductService.active_variants(db)
        ]

    @staticmethod
    def preview_price_excel(db: Session, content: bytes, filename: Optional[str]) -> PriceExcelPreviewOut:
        """Đọc file giá đã điền và so với giá hiện tại. KHÔNG ghi gì vào CSDL (áp dụng bằng apply_prices)."""
        spec = PRICE_TEMPLATE
        rows, errors = read_template(content, filename, spec)

        product_ids = {r.values["product_id"] for r in rows if r.values["product_id"] is not None}
        variants = {}
        if product_ids:
            for ps in (
                db.query(ProductSize)
                .filter(ProductSize.product_id.in_(product_ids))
                .options(joinedload(ProductSize.product), joinedload(ProductSize.size))
                .all()
            ):
                variants[(ps.product_id, ps.size_id)] = ps

        changes: List[PriceChangeOut] = []
        unchanged = 0
        seen = {}
        for r in rows:
            v = r.values

            def error(key: str, message: str):
                errors.append(ExcelRowError(row=r.row, column=spec.header(key), message=message))

            if v["product_id"] is None or v["size_id"] is None:
                error("product_id", "Thiếu Mã SP / Mã size. Đừng xóa hai cột này trong file mẫu")
                continue
            key = (v["product_id"], v["size_id"])
            ps = variants.get(key)
            if not ps:
                error("product_id", f"Không tìm thấy bánh #{key[0]} với kích cỡ này (có thể đã bị xóa). Hãy tải lại file mẫu")
                continue
            name = ps.product.product_name
            if ps.product.status == "Discontinued":
                error("product_name", f"\"{name}\" đã ngừng kinh doanh")
                continue
            if key in seen:
                error("product_id", f"\"{name}\" cùng kích cỡ đã có ở dòng {seen[key]}")
                continue
            seen[key] = r.row

            new_price = v["new_price"]
            if new_price == 0:
                error("new_price", "Giá bán phải lớn hơn 0")
                continue
            if new_price == ps.price:
                unchanged += 1
                continue
            changes.append(PriceChangeOut(
                row=r.row,
                product_id=ps.product_id,
                product_name=name,
                size_id=ps.size_id,
                size_name=ps.size.size_name if ps.size else "",
                old_price=ps.price,
                new_price=new_price,
            ))

        if not changes and not errors:
            raise BadRequestError(
                "Không có giá nào thay đổi so với hiện tại" if unchanged else "File chưa có dòng nào được điền giá bán mới"
            )
        return PriceExcelPreviewOut(changes=changes, unchanged=unchanged, errors=finalize_errors(errors))

    @staticmethod
    def apply_prices(db: Session, items: List[PriceUpdateItem]) -> Set[int]:
        """Đổi giá nhiều biến thể trong một giao dịch (lỗi một dòng thì không đổi dòng nào). Trả về các product_id đã đổi."""
        keys = [(i.product_id, i.size_id) for i in items]
        if len(set(keys)) != len(keys):
            raise BadRequestError("Danh sách có bánh cùng kích cỡ bị lặp")

        variants = {
            (ps.product_id, ps.size_id): ps
            for ps in (
                db.query(ProductSize)
                .filter(tuple_(ProductSize.product_id, ProductSize.size_id).in_(keys))
                .with_for_update()
                .all()
            )
        }
        changed: Set[int] = set()
        for item in items:
            ps = variants.get((item.product_id, item.size_id))
            if not ps:
                db.rollback()
                raise BadRequestError(f"Bánh #{item.product_id} không còn kích cỡ này, hãy chọn lại file")
            label = f"\"{ps.product.product_name}\" ({ps.size.size_name if ps.size else item.size_id})"
            if item.price <= 0:
                db.rollback()
                raise BadRequestError(f"Giá bán của {label} phải lớn hơn 0")
            if item.old_price is not None and ps.price != item.old_price:
                db.rollback()
                raise BadRequestError(
                    f"Giá của {label} vừa được thay đổi bởi người khác. Hãy chọn lại file để xem giá mới nhất"
                )
            if ps.price != item.price:
                ps.price = item.price
                changed.add(ps.product_id)
        db.commit()
        return changed

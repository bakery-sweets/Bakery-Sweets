from typing import List, Optional
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import BadRequestError, NotFoundError
from thesweets_common.models.product import Product, Category, Size, ProductSize
from app.schemas.product import ProductOut, ProductSizeOut

class ProductService:
    @staticmethod
    def get_categories(db: Session) -> List[Category]:
        return db.query(Category).all()

    @staticmethod
    def get_sizes(db: Session) -> List[Size]:
        return db.query(Size).all()

    @staticmethod
    def to_product_out(p: Product) -> ProductOut:
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

    @staticmethod
    def _base_query(db: Session):
        return db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.sizes).joinedload(ProductSize.size)
        )

    @staticmethod
    def get_products(
        db: Session,
        category_id: Optional[int] = None,
        keyword: Optional[str] = None,
        status: Optional[str] = "Available",
        skip: int = 0,
        limit: int = 50,
    ) -> List[ProductOut]:
        query = ProductService._base_query(db)

        if category_id:
            query = query.filter(Product.category_id == category_id)

        if status and status != "All":
            query = query.filter(Product.status == status)

        if keyword:
            term = f"%{keyword}%"
            query = query.filter(Product.product_name.ilike(term))

        products = query.offset(skip).limit(limit).all()
        return [ProductService.to_product_out(p) for p in products]

    @staticmethod
    def get_size(db: Session, product_id: int, size_id: int, lock: bool = False) -> Optional[ProductSize]:
        """Một biến thể (bánh + kích cỡ); lock=True khóa dòng tồn kho tới khi commit (dùng khi đặt đơn)"""
        query = db.query(ProductSize).filter(
            ProductSize.product_id == product_id,
            ProductSize.size_id == size_id,
        )
        if lock:
            return query.with_for_update().first()
        return query.options(joinedload(ProductSize.product), joinedload(ProductSize.size)).first()

    @staticmethod
    def out_of_stock_error(ps: ProductSize) -> BadRequestError:
        name = ps.product.product_name if ps.product else f"#{ps.product_id}"
        size = ps.size.size_name if ps.size else f"#{ps.size_id}"
        return BadRequestError(
            f"Số lượng trong kho không đủ: '{name}' ({size}) chỉ còn {ps.stock_quantity} cái",
        )

    @staticmethod
    def get_sellable_size(db: Session, product_id: int, size_id: int, quantity: int, lock: bool = False) -> ProductSize:
        """Biến thể còn kinh doanh và đủ tồn kho cho `quantity` cái — luật chung của giỏ hàng và đặt đơn"""
        ps = ProductService.get_size(db, product_id, size_id, lock=lock)
        if not ps:
            raise NotFoundError("Sản phẩm hoặc kích cỡ không hợp lệ")

        if ps.product and ps.product.status != "Available":
            raise BadRequestError(
                f"Bánh '{ps.product.product_name}' hiện không còn kinh doanh, vui lòng xóa khỏi giỏ hàng",
            )

        if ps.stock_quantity < quantity:
            raise ProductService.out_of_stock_error(ps)
        return ps

    @staticmethod
    def get_product_detail(db: Session, product_id: int) -> ProductOut:
        p = ProductService._base_query(db).filter(Product.product_id == product_id).first()

        if not p:
            raise NotFoundError("Không tìm thấy sản phẩm bánh này")

        return ProductService.to_product_out(p)

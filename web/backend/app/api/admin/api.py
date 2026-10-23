from fastapi import APIRouter
from .auth import router as auth_router
from .products import router as products_router
from .orders import router as orders_router
from .users import router as users_router
from .dashboard import router as dashboard_router
from .statistical import router as statistical_router
from .import_receipts import router as import_receipts_router
from .promotions import router as promotions_router

admin_router = APIRouter()

admin_router.include_router(auth_router, prefix="/auth", tags=["Admin: Auth"])
admin_router.include_router(dashboard_router, prefix="/dashboard", tags=["Admin: Dashboard"])
admin_router.include_router(products_router, prefix="/products", tags=["Admin: Products"])
admin_router.include_router(orders_router, prefix="/orders", tags=["Admin: Orders"])
admin_router.include_router(users_router, prefix="/users", tags=["Admin: Users"])
admin_router.include_router(statistical_router, prefix="/statistical", tags=["Admin: Statistical"])
admin_router.include_router(import_receipts_router, prefix="/import-receipts", tags=["Admin: Import Receipts"])
admin_router.include_router(promotions_router, prefix="/promotions", tags=["Admin: Promotions"])

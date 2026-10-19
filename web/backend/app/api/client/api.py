from fastapi import APIRouter
from .auth import router as auth_router
from .products import router as products_router
from .cart import router as cart_router
from .orders import router as orders_router
from .profile import router as profile_router

client_router = APIRouter()

client_router.include_router(auth_router, prefix="/auth", tags=["Client: Auth"])
client_router.include_router(products_router, prefix="/products", tags=["Client: Products"])
client_router.include_router(cart_router, prefix="/cart", tags=["Client: Cart"])
client_router.include_router(orders_router, prefix="/orders", tags=["Client: Orders"])
client_router.include_router(profile_router, prefix="/profile", tags=["Client: Profile"])

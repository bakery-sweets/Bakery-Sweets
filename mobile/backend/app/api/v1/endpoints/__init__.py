from .auth import router as auth_router
from .products import router as products_router
from .cart import router as cart_router
from .orders import router as orders_router
from .notifications import router as notifications_router
from .websocket import router as websocket_router
from .promotions import router as promotions_router
from .upload import router as upload_router

__all__ = [
    "auth_router",
    "products_router",
    "cart_router",
    "orders_router",
    "notifications_router",
    "websocket_router",
    "promotions_router",
    "upload_router",
]

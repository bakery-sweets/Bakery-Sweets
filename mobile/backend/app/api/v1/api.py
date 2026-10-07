from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth_router,
    products_router,
    cart_router,
    orders_router,
    notifications_router,
    websocket_router,
)

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(products_router, tags=["Products & Categories"])
api_router.include_router(cart_router, tags=["Shopping Cart"])
api_router.include_router(orders_router, tags=["Orders"])
api_router.include_router(notifications_router, tags=["Notifications"])
api_router.include_router(websocket_router, tags=["WebSockets (Real-time)"])
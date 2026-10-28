import uvicorn
from fastapi import FastAPI

from app.core.config import settings
from app.api.websocket import router as websocket_router
from app.api.internal import router as internal_router
from app.services.connection_manager import manager

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Realtime Server (WebSocket) dùng chung cho Web React và App Flutter của Tiệm Bánh The Sweets",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# /ws: client (Web, App) kết nối; /internal/events: Web Backend & Mobile Backend gửi sự kiện
app.include_router(websocket_router)
app.include_router(internal_router)

@app.get("/", tags=["Health Check"])
def root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "websocket": "/ws",
    }

@app.get("/health", tags=["Health Check"])
def health_check():
    return {"status": "healthy", "connections": len(manager.connections)}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)

import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import engine, Base
from app.api.admin import admin_router
from app.api.client import client_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi động ứng dụng (kiểm tra schema hoặc tạo bảng nếu cần)
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[Warning] Không thể tự động tạo bảng DB khi startup: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API Backend phục vụ Web Portal (Admin Dashboard & Client Storefront) của Tiệm Bánh The Sweets",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Cấu hình CORS để React Frontend (Vite port 3000) gọi được
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký 2 cụm Router riêng biệt: Admin & Client
app.include_router(admin_router, prefix=f"{settings.API_PREFIX}/admin")
app.include_router(client_router, prefix=f"{settings.API_PREFIX}/client")

@app.get("/", tags=["Health Check"])
def root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "admin_api": f"{settings.API_PREFIX}/admin",
        "client_api": f"{settings.API_PREFIX}/client",
        "docs": "/docs",
    }

@app.get("/health", tags=["Health Check"])
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)

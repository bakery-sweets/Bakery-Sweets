import uvicorn
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.config.database import engine, Base
from app.api.v1.api import api_router
from app.api.v1.endpoints.websocket import router as ws_root_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi động ứng dụng (tạo bảng nếu chưa có, hoặc kiểm tra kết nối)
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[Warning] Không thể tự động tạo bảng DB khi startup: {e}")
    yield

app = FastAPI(
    title="The Sweets — Mobile API",
    description="API Backend phục vụ ứng dụng Mobile Flutter & Real-time WebSockets của Tiệm Bánh The Sweets",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Cấu hình CORS để Flutter Mobile & React Web đều gọi được
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phục vụ toàn bộ media / hình ảnh sản phẩm & banner qua static files
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Đăng ký tập hợp router chính từ folder api/v1
app.include_router(api_router, prefix="/api/v1")

# Hỗ trợ thêm alias /ws không cần tiền tố /api/v1 để tiện kết nối socket trực tiếp
app.include_router(ws_root_router)

@app.get("/", tags=["Health Check"])
def root():
    return {
        "status": "online",
        "app": "The Sweets Mobile API",
        "version": "1.0.0",
        "docs": "/docs",
    }

@app.get("/health", tags=["Health Check"])
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.exceptions import (
    AppError,
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
)

# Ánh xạ lỗi nghiệp vụ -> mã HTTP (chỉ tầng API mới biết đến HTTP)
STATUS_CODES = {
    BadRequestError: 400,
    UnauthorizedError: 401,
    ForbiddenError: 403,
    NotFoundError: 404,
}

def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError):
        # Giữ định dạng {"detail": ...} giống HTTPException để client không phải đổi cách đọc lỗi
        status_code = next((code for cls, code in STATUS_CODES.items() if isinstance(exc, cls)), 500)
        return JSONResponse(status_code=status_code, content={"detail": exc.detail})

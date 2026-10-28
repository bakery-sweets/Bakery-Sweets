class AppError(Exception):
    """
    Lỗi nghiệp vụ do tầng Service phát sinh.
    Tầng Service không biết gì về HTTP; tầng API (app/api/errors.py) chuyển các lỗi này thành mã HTTP.
    """

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail

class BadRequestError(AppError):
    """Dữ liệu / thao tác không hợp lệ theo quy tắc nghiệp vụ"""

class UnauthorizedError(AppError):
    """Sai thông tin đăng nhập"""

class ForbiddenError(AppError):
    """Không có quyền hoặc tài khoản bị khóa"""

class NotFoundError(AppError):
    """Không tìm thấy dữ liệu"""

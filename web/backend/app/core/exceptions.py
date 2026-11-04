class AppError(Exception):
    """
    Lỗi nghiệp vụ do tầng Service phát sinh.
    Tầng Service không biết gì về HTTP; tầng API (app/api/errors.py) chuyển các lỗi này thành mã HTTP.
    """

    # Mã lỗi máy đọc được (trả kèm trong JSON) để client phân biệt các tình huống nghiệp vụ, VD: hết hàng
    code: str | None = None

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail

class BadRequestError(AppError):
    """Dữ liệu / thao tác không hợp lệ theo quy tắc nghiệp vụ"""

class OutOfStockError(BadRequestError):
    """Không đủ tồn kho (thường do khách khác vừa mua trước) — không phải lỗi hệ thống"""
    code = "OUT_OF_STOCK"

class UnauthorizedError(AppError):
    """Sai thông tin đăng nhập"""

class ForbiddenError(AppError):
    """Không có quyền hoặc tài khoản bị khóa"""

class NotFoundError(AppError):
    """Không tìm thấy dữ liệu"""

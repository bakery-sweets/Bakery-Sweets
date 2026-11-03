from fastapi import UploadFile
from fastapi.responses import Response

from app.core.exceptions import BadRequestError
from app.services.excel_import import MAX_FILE_SIZE

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
PDF = "application/pdf"

async def read_upload(file: UploadFile, max_size: int = MAX_FILE_SIZE) -> bytes:
    """Đọc file tải lên, dừng ngay khi vượt giới hạn thay vì đọc hết vào bộ nhớ"""
    content = await file.read(max_size + 1)
    if len(content) > max_size:
        raise BadRequestError(f"File quá lớn (tối đa {max_size // (1024 * 1024)} MB)")
    return content

def file_response(content: bytes, filename: str, media_type: str) -> Response:
    """Trả file để trình duyệt tải về (tên file chỉ dùng ký tự ASCII)"""
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

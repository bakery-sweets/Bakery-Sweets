from fastapi.responses import Response

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
PDF = "application/pdf"

def file_response(content: bytes, filename: str, media_type: str) -> Response:
    """Trả file để trình duyệt tải về (tên file chỉ dùng ký tự ASCII)"""
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

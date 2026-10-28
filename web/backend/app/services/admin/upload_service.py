import os
import uuid
from typing import Optional
from app.core.exceptions import BadRequestError

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Thư mục uploads nằm cùng cấp với main.py (web/backend/uploads)
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
UPLOAD_DIR = os.path.join(BACKEND_ROOT, "uploads")

class AdminUploadService:
    @staticmethod
    def save_product_image(filename: Optional[str], content: bytes) -> dict:
        ext = os.path.splitext(filename)[1].lower() if filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise BadRequestError("Định dạng tệp không hợp lệ. Vui lòng chọn ảnh JPG, PNG, WEBP, GIF, SVG.")

        if len(content) > MAX_FILE_SIZE:
            raise BadRequestError("Kích thước tệp quá lớn. Tối đa 10MB.")

        os.makedirs(UPLOAD_DIR, exist_ok=True)
        safe_name = f"cake_{uuid.uuid4().hex[:10]}{ext}"
        with open(os.path.join(UPLOAD_DIR, safe_name), "wb") as f:
            f.write(content)

        return {
            "url": f"/uploads/{safe_name}",
            "filename": safe_name,
            "original_name": filename,
        }

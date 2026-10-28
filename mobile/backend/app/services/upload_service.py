import os
import uuid
import re
from typing import Optional

from app.core.exceptions import BadRequestError

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Thư mục uploads nằm cùng cấp với main.py (mobile/backend/uploads)
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BASE_UPLOAD_DIR = os.path.join(BACKEND_ROOT, "uploads")

class UploadService:
    @staticmethod
    def save_image(filename: Optional[str], content: bytes, folder: Optional[str] = "products") -> dict:
        if not filename:
            raise BadRequestError(
                "Tên file không hợp lệ hoặc không có file được chọn"
            )

        # Kiểm tra phần mở rộng định dạng file
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise BadRequestError(
                f"Định dạng file không được hỗ trợ ({ext}). Chỉ chấp nhận: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # Làm sạch tên thư mục (chỉ cho phép chữ cái, số, gạch dưới)
        clean_folder = re.sub(r'[^a-zA-Z0-9_\-]', '', folder or "products") or "products"
        target_dir = os.path.join(BASE_UPLOAD_DIR, clean_folder)
        os.makedirs(target_dir, exist_ok=True)

        # Làm sạch tên file gốc
        clean_original_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', filename)
        unique_filename = f"{uuid.uuid4().hex[:10]}_{clean_original_name}"
        target_file_path = os.path.join(target_dir, unique_filename)

        if len(content) > MAX_FILE_SIZE:
            raise BadRequestError(
                "Kích thước file vượt quá giới hạn cho phép (tối đa 10MB)"
            )

        with open(target_file_path, "wb") as f:
            f.write(content)

        relative_url = f"/uploads/{clean_folder}/{unique_filename}"

        return {
            "status": "success",
            "message": "Upload hình ảnh thành công",
            "filename": unique_filename,
            "relative_url": relative_url,
            "url": relative_url,
        }

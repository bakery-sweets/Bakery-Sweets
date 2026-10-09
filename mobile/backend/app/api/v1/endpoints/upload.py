import os
import uuid
import re
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status

router = APIRouter(tags=["Media Upload"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder: Optional[str] = Form("products"),
):
    """
    API Upload hình ảnh dành cho Web Admin và Mobile Client.
    Hỗ trợ upload ảnh sản phẩm, banner quảng cáo hoặc avatar.
    Lưu trữ file tập trung tại thư mục /uploads trên server và phục vụ qua HTTP Static Files.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên file không hợp lệ hoặc không có file được chọn"
        )

    # Kiểm tra phần mở rộng định dạng file
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Định dạng file không được hỗ trợ ({ext}). Chỉ chấp nhận: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Làm sạch tên thư mục (chỉ cho phép chữ cái, số, gạch dưới)
    clean_folder = re.sub(r'[^a-zA-Z0-9_\-]', '', folder or "products") or "products"

    # Thư mục đích trên server (nằm cùng cấp với main.py)
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
    base_upload_dir = os.path.join(backend_root, "uploads")
    target_dir = os.path.join(base_upload_dir, clean_folder)
    os.makedirs(target_dir, exist_ok=True)

    # Làm sạch tên file gốc
    clean_original_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', file.filename)
    unique_filename = f"{uuid.uuid4().hex[:10]}_{clean_original_name}"
    target_file_path = os.path.join(target_dir, unique_filename)

    # Đọc và ghi file
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kích thước file vượt quá giới hạn cho phép (tối đa 10MB)"
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

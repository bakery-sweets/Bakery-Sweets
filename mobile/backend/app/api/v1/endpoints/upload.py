from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form

from app.api.deps import require_staff
from app.services.upload_service import UploadService
from thesweets_common.models.user import User

router = APIRouter(tags=["Media Upload"])

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder: Optional[str] = Form("products"),
    staff: User = Depends(require_staff),
):
    """
    API Upload hình ảnh (ảnh sản phẩm, banner quảng cáo), chỉ dành cho admin / staff.
    Lưu trữ file tập trung tại thư mục /uploads trên server và phục vụ qua HTTP Static Files.
    """
    content = await file.read()
    return UploadService.save_image(file.filename, content, folder)

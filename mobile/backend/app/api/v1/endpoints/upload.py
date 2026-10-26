from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form

from app.services.upload_service import UploadService

router = APIRouter(tags=["Media Upload"])

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
    return await UploadService.save_image(file, folder)

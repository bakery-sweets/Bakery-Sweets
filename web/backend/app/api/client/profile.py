from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.api.client.auth import to_profile_out
from thesweets_common.models.user import User
from app.schemas.client.auth import ClientProfileOut
from app.schemas.client.profile import ProfileUpdateRequest, ChangePasswordRequest
from app.schemas.common import ResponseBase
from app.services.client.profile_service import ClientProfileService

router = APIRouter()

@router.put("", response_model=ResponseBase[ClientProfileOut], summary="Cập nhật thông tin cá nhân")
def update_profile(
    data: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user = ClientProfileService.update_profile(db, user, data)
    return ResponseBase(message="Cập nhật thông tin thành công", data=to_profile_out(user))

@router.post("/change-password", response_model=ResponseBase, summary="Đổi mật khẩu")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ClientProfileService.change_password(db, user, data)
    return ResponseBase(message="Đổi mật khẩu thành công")

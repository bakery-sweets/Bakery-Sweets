from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.models.user import User
from app.schemas.common import ResponseBase

router = APIRouter()

class AdminUserItemOut(BaseModel):
    user_name: str
    email: str
    role: str
    status: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

@router.get("", response_model=ResponseBase[List[AdminUserItemOut]], summary="Danh sách tài khoản")
def list_users(
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(User)
    if role and role != "all":
        query = query.filter(User.role == role)
    users = query.all()

    data = []
    for u in users:
        fn, ln, ph = None, None, None
        if u.customer:
            fn, ln, ph = u.customer.first_name, u.customer.last_name, u.customer.phone
        elif u.employee:
            fn, ln, ph = u.employee.first_name, u.employee.last_name, u.employee.phone

        data.append(AdminUserItemOut(
            user_name=u.user_name,
            email=u.email,
            role=u.role,
            status=u.status,
            first_name=fn,
            last_name=ln,
            phone=ph,
        ))
    return ResponseBase(data=data)

@router.patch("/{user_name}/status", response_model=ResponseBase, summary="Khóa / Mở khóa tài khoản người dùng")
def toggle_user_status(
    user_name: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.user_name == user_name).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    user.status = "locked" if user.status == "active" else "active"
    db.commit()
    return ResponseBase(message=f"Đã chuyển trạng thái tài khoản sang {user.status}")

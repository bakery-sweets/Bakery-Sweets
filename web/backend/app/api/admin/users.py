from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.models.user import User
from app.schemas.common import ResponseBase

router = APIRouter()

class AdminUserItemOut(BaseModel):
    phone: str
    email: str
    role: str
    status: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    created_at: Optional[datetime] = None

@router.get("", response_model=ResponseBase[List[AdminUserItemOut]], summary="Danh sách tài khoản")
def list_users(
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(User)
    if role and role != "all":
        query = query.filter(User.role == role)
    users = query.order_by(User.created_at.desc()).all()

    data = []
    for u in users:
        data.append(AdminUserItemOut(
            phone=u.phone,
            email=u.email,
            role=u.role,
            status=u.status,
            first_name=u.customer.first_name if u.customer else None,
            last_name=u.customer.last_name if u.customer else None,
            created_at=u.created_at,
        ))
    return ResponseBase(data=data)

@router.patch("/{phone}/status", response_model=ResponseBase, summary="Khóa / Mở khóa tài khoản người dùng")
def toggle_user_status(
    phone: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    user.status = "locked" if user.status == "active" else "active"
    db.commit()
    return ResponseBase(message=f"Đã chuyển trạng thái tài khoản sang {user.status}")

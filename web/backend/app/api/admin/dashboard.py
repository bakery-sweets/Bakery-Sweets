from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.models.user import User
from app.services.admin.stats_service import AdminStatsService
from app.schemas.admin.statistical import DashboardOverviewOut
from app.schemas.common import ResponseBase

router = APIRouter()

@router.get("/overview", response_model=ResponseBase[DashboardOverviewOut], summary="Số liệu tổng quan Dashboard")
def get_dashboard_overview(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    overview = AdminStatsService.get_dashboard_overview(db)
    return ResponseBase(data=overview)

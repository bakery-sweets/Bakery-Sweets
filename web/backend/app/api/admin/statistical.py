from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.api.files import file_response, XLSX
from thesweets_common.models.user import User
from app.services.admin.stats_service import AdminStatsService
from app.services.admin.report_service import AdminReportService
from app.schemas.admin.statistical import DashboardOverviewOut
from app.schemas.admin.report import ReportPeriod, RevenueReportOut
from app.schemas.common import ResponseBase

router = APIRouter()

@router.get("/overview", response_model=ResponseBase[DashboardOverviewOut], summary="Thống kê tổng hợp")
def get_stats_overview(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    overview = AdminStatsService.get_dashboard_overview(db)
    return ResponseBase(data=overview)

@router.get("/report", response_model=ResponseBase[RevenueReportOut], summary="Báo cáo doanh thu theo kỳ")
def get_revenue_report(
    period: ReportPeriod = Query("week", description="today | week | month | quarter | year"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    return ResponseBase(data=AdminReportService.revenue_report(db, period))

@router.get("/report/export", summary="Xuất báo cáo doanh thu ra file Excel")
def export_revenue_report(
    period: ReportPeriod = Query("week", description="today | week | month | quarter | year"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    content, filename = AdminReportService.export_excel(db, period)
    return file_response(content, filename, XLSX)

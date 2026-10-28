from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.api.files import file_response, XLSX
from app.core.exceptions import BadRequestError
from thesweets_common.models.user import User
from app.services.admin.stats_service import AdminStatsService
from app.services.admin.report_service import AdminReportService
from app.schemas.admin.statistical import DashboardOverviewOut
from app.schemas.admin.report import CustomerGroupBy, GroupBy, ReportFilter, RevenueReportOut
from app.schemas.common import ResponseBase

router = APIRouter()

def report_filter(
    from_date: Optional[date] = Query(None, description="Bảng tổng tiền hóa đơn: từ ngày (YYYY-MM-DD), mặc định 01/01 của năm đến ngày"),
    to_date: Optional[date] = Query(None, description="Bảng tổng tiền hóa đơn: đến ngày (YYYY-MM-DD), mặc định hôm nay"),
    time_from_date: Optional[date] = Query(None, description="Bảng thu - chi theo ngày: từ ngày, mặc định bằng from_date"),
    time_to_date: Optional[date] = Query(None, description="Bảng thu - chi theo ngày: đến ngày, mặc định bằng to_date"),
    time_year: Optional[int] = Query(None, ge=1900, le=9999, description="Bảng thu - chi theo tháng / quý: năm, mặc định năm hiện tại"),
    group_by: GroupBy = Query("month", description="Bảng thu - chi theo: day | month | quarter | year"),
    customer_group_by: CustomerGroupBy = Query("quarter", description="Bảng theo khách hàng theo: quarter | year"),
) -> ReportFilter:
    to_date = to_date or date.today()
    from_date = from_date or to_date.replace(month=1, day=1)
    time_to_date = time_to_date or to_date
    time_from_date = time_from_date or min(from_date, time_to_date)
    if from_date > to_date or time_from_date > time_to_date:
        raise BadRequestError("Từ ngày phải nhỏ hơn hoặc bằng Đến ngày")
    return ReportFilter(
        from_date=from_date, to_date=to_date, time_from_date=time_from_date, time_to_date=time_to_date,
        time_year=time_year or date.today().year,
        group_by=group_by, customer_group_by=customer_group_by,
    )

@router.get("/overview", response_model=ResponseBase[DashboardOverviewOut], summary="Thống kê tổng hợp")
def get_stats_overview(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    overview = AdminStatsService.get_dashboard_overview(db)
    return ResponseBase(data=overview)

@router.get("/report", response_model=ResponseBase[RevenueReportOut], summary="Báo cáo doanh thu từ ngày đến ngày")
def get_revenue_report(
    admin: User = Depends(get_current_admin),
    f: ReportFilter = Depends(report_filter),
    db: Session = Depends(get_db),
):
    return ResponseBase(data=AdminReportService.revenue_report(db, f))

@router.get("/report/export", summary="Xuất báo cáo doanh thu ra file Excel")
def export_revenue_report(
    admin: User = Depends(get_current_admin),
    f: ReportFilter = Depends(report_filter),
    db: Session = Depends(get_db),
):
    content, filename = AdminReportService.export_excel(db, f)
    return file_response(content, filename, XLSX)

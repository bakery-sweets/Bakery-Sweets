from typing import List, Literal
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

ReportPeriod = Literal["today", "week", "month", "quarter", "year"]

class RevenueBucketOut(BaseModel):
    """Một cột của biểu đồ doanh thu (2 giờ / 1 ngày / 1 tháng tùy kỳ báo cáo)"""
    label: str
    full_label: str
    order_count: int
    revenue: Decimal

class ShareItemOut(BaseModel):
    name: str
    value: Decimal
    percent: int

class ProductRankOut(BaseModel):
    rank: int
    product_id: int
    name: str
    category: str
    sales: int
    revenue: Decimal
    percent: int

class RevenueReportOut(BaseModel):
    period: ReportPeriod
    period_label: str
    chart_title: str
    start_date: datetime
    end_date: datetime
    revenue: Decimal
    order_count: int
    cancelled_count: int
    items_sold: int
    avg_order_value: Decimal
    buckets: List[RevenueBucketOut]
    category_share: List[ShareItemOut]
    payment_share: List[ShareItemOut]
    product_ranking: List[ProductRankOut]

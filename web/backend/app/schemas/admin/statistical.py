from typing import List
from pydantic import BaseModel
from decimal import Decimal

class DashboardOverviewOut(BaseModel):
    total_revenue: Decimal
    total_orders: int
    total_products: int
    total_customers: int

class RevenueStatItem(BaseModel):
    date: str
    revenue: Decimal
    order_count: int

class TopProductItem(BaseModel):
    product_id: int
    product_name: str
    total_sold: int
    total_revenue: Decimal

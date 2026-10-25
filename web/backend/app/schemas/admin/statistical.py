from typing import List, Optional
from pydantic import BaseModel
from decimal import Decimal

class HourlyStatItem(BaseModel):
    label: str
    order_count: int
    revenue: Decimal
    percentage: float

class KitchenStockStats(BaseModel):
    total_imported: int
    total_sold: int
    total_in_stock: int
    ready_rate: float

class DashboardOverviewOut(BaseModel):
    total_revenue: Decimal
    total_orders: int
    total_products: int
    total_customers: int
    hourly_stats: List[HourlyStatItem] = []
    kitchen_stats: Optional[KitchenStockStats] = None

class RevenueStatItem(BaseModel):
    date: str
    revenue: Decimal
    order_count: int

class TopProductItem(BaseModel):
    product_id: int
    product_name: str
    total_sold: int
    total_revenue: Decimal

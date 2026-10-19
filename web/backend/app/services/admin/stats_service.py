from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.order import Order
from app.models.product import Product
from app.models.user import Customer
from app.schemas.admin.statistical import DashboardOverviewOut

class AdminStatsService:
    @staticmethod
    def get_dashboard_overview(db: Session) -> DashboardOverviewOut:
        total_revenue = db.query(func.coalesce(func.sum(Order.final_cost), 0)).filter(Order.status == "Completed").scalar()
        total_orders = db.query(func.count(Order.order_id)).scalar() or 0
        total_products = db.query(func.count(Product.product_id)).scalar() or 0
        total_customers = db.query(func.count(Customer.customer_id)).scalar() or 0

        return DashboardOverviewOut(
            total_revenue=Decimal(str(total_revenue)),
            total_orders=total_orders,
            total_products=total_products,
            total_customers=total_customers,
        )

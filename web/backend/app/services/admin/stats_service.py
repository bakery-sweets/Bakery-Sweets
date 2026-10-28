from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from thesweets_common.models.order import Order, OrderDetail
from thesweets_common.models.product import Product, ProductSize
from thesweets_common.models.user import Customer
from thesweets_common.models.import_receipt import ImportReceipt, ImportReceiptDetail
from app.schemas.admin.statistical import DashboardOverviewOut, HourlyStatItem, KitchenStockStats

class AdminStatsService:
    @staticmethod
    def get_dashboard_overview(db: Session) -> DashboardOverviewOut:
        total_revenue = db.query(func.coalesce(func.sum(Order.final_cost), 0)).filter(Order.status == "Completed").scalar()
        total_orders = db.query(func.count(Order.order_id)).scalar() or 0
        total_products = db.query(func.count(Product.product_id)).scalar() or 0
        total_customers = db.query(func.count(Customer.customer_id)).scalar() or 0

        # 1. Thống kê nhịp độ theo khung giờ hoạt động của tiệm bánh
        slots_def = [
            ("09h", 8, 10),
            ("11h", 10, 12),
            ("14h-16h", 12, 16),
            ("17h", 16, 18),
            ("19h", 18, 20),
            ("21h", 20, 22),
        ]

        active_or_done_orders = db.query(Order).filter(Order.status != "Cancelled").all()
        hourly_items = []
        for label, from_h, to_h in slots_def:
            matching = [
                o for o in active_or_done_orders
                if (o.order_date and from_h <= o.order_date.hour < to_h) or (o.pickup_time and from_h <= o.pickup_time.hour < to_h)
            ]
            order_cnt = len(matching)
            rev = sum(Decimal(str(o.final_cost)) for o in matching if o.status == "Completed")
            hourly_items.append({"label": label, "order_count": order_cnt, "revenue": rev})

        max_rev = max([item["revenue"] for item in hourly_items] or [Decimal("0")])
        max_cnt = max([item["order_count"] for item in hourly_items] or [0])

        hourly_stats = []
        for item in hourly_items:
            if max_rev > 0:
                pct = float(round((item["revenue"] / max_rev) * 100, 1))
            elif max_cnt > 0:
                pct = float(round((item["order_count"] / max_cnt) * 100, 1))
            else:
                pct = 0.0
            hourly_stats.append(HourlyStatItem(
                label=item["label"],
                order_count=item["order_count"],
                revenue=item["revenue"],
                percentage=pct
            ))

        # 2. Thống kê tiến độ nhập hàng & tồn tủ mát
        total_in_stock = int(db.query(func.coalesce(func.sum(ProductSize.stock_quantity), 0)).scalar() or 0)
        total_sold = int(db.query(func.coalesce(func.sum(OrderDetail.quantity), 0)).join(Order).filter(Order.status == "Completed").scalar() or 0)
        receipt_imported = int(db.query(func.coalesce(func.sum(ImportReceiptDetail.quantity), 0)).join(ImportReceipt).filter(ImportReceipt.status == "Completed").scalar() or 0)
        total_imported = max(receipt_imported, total_in_stock + total_sold)
        ready_rate = float(round((total_in_stock / total_imported * 100), 1)) if total_imported > 0 else 0.0

        kitchen_stats = KitchenStockStats(
            total_imported=total_imported,
            total_sold=total_sold,
            total_in_stock=total_in_stock,
            ready_rate=ready_rate
        )

        return DashboardOverviewOut(
            total_revenue=Decimal(str(total_revenue)),
            total_orders=total_orders,
            total_products=total_products,
            total_customers=total_customers,
            hourly_stats=hourly_stats,
            kitchen_stats=kitchen_stats,
        )

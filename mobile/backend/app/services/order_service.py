from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import random
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.user import User
from app.models.order import Order, OrderDetail, OrderPromotion, OrderStatusLog, Cart
from app.models.notification import Notification
from app.schemas.order import OrderCreate, OrderOut, OrderDetailOut, OrderStatusLogOut
from app.services.product_service import ProductService
from app.services.promotion_service import PromotionService
from app.services.realtime_service import RealtimeService

VALID_STATUSES = ["Pending", "Processing", "Ready", "Completed", "Cancelled"]

# Cùng luật với Web Backend: giờ hẹn lấy bánh là giờ Việt Nam (UTC+7), không ở quá khứ, tối đa 30 ngày tới
VN_TZ = timezone(timedelta(hours=7))
PICKUP_CLOCK_SKEW = timedelta(minutes=5)
PICKUP_MAX_AHEAD = timedelta(days=30)

def _validate_pickup_time(pickup_time: Optional[datetime]) -> Optional[datetime]:
    if pickup_time is None:
        return None
    if pickup_time.tzinfo is not None:
        pickup_time = pickup_time.astimezone(VN_TZ).replace(tzinfo=None)
    now = datetime.now(VN_TZ).replace(tzinfo=None)
    if pickup_time < now - PICKUP_CLOCK_SKEW:
        raise HTTPException(status_code=400, detail="Giờ lấy bánh phải ở thời điểm sau hiện tại")
    if pickup_time > now + PICKUP_MAX_AHEAD:
        raise HTTPException(status_code=400, detail="Chỉ nhận đặt bánh trước tối đa 30 ngày")
    return pickup_time

def _merge_items(req: OrderCreate) -> Dict[Tuple[int, int], dict]:
    """order_detail có khóa chính (order_id, product_id, size_id) nên gộp các dòng trùng món + size"""
    merged: Dict[Tuple[int, int], dict] = {}
    for item in req.items:
        line = merged.setdefault((item.product_id, item.size_id), {"quantity": 0, "notes": []})
        line["quantity"] += item.quantity
        if item.note and item.note.strip():
            line["notes"].append(item.note.strip())
    return merged

class OrderService:
    @staticmethod
    def to_order_out(o: Order) -> OrderOut:
        detail_list = []
        for d in o.details:
            detail_list.append(OrderDetailOut(
                product_id=d.product_id,
                product_name=d.product.product_name if d.product else "",
                image=d.product.image if d.product else None,
                size_id=d.size_id,
                size_name=d.size.size_name if d.size else "",
                quantity=d.quantity,
                price=d.price,
                subtotal=d.price * d.quantity,
                note=d.note,
            ))

        log_list = []
        for log in o.status_logs:
            log_list.append(OrderStatusLogOut(
                log_id=log.log_id,
                old_status=log.old_status,
                new_status=log.new_status,
                note=log.note,
                changed_at=log.changed_at,
                changed_by=log.changed_by,
            ))

        return OrderOut(
            order_id=o.order_id,
            order_code=o.order_code,
            customer_id=o.customer_id,
            recipient_name=o.recipient_name,
            recipient_phone=o.recipient_phone,
            pickup_time=o.pickup_time,
            notes=o.notes,
            promotion_id=o.promotion_id,
            discount_amount=o.discount_amount,
            total_quantity=o.total_quantity,
            total_cost=o.total_cost,
            final_cost=o.final_cost,
            payment_method=o.payment_method,
            payment_status=o.payment_status,
            status=o.status,
            order_date=o.order_date,
            details=detail_list,
            status_logs=log_list,
        )

    @staticmethod
    def _base_query(db: Session):
        return db.query(Order).options(
            joinedload(Order.details).joinedload(OrderDetail.product),
            joinedload(Order.details).joinedload(OrderDetail.size),
            joinedload(Order.status_logs),
        )

    @staticmethod
    def get_orders(db: Session, user: User, status: str = "All") -> List[OrderOut]:
        """Khách hàng chỉ thấy đơn của mình; admin / staff thấy tất cả"""
        query = OrderService._base_query(db)

        if user.role == "customer":
            customer_id = user.customer.customer_id if user.customer else -1
            query = query.filter(Order.customer_id == customer_id)

        if status and status != "All":
            query = query.filter(Order.status == status)

        orders = query.order_by(Order.order_id.desc()).all()
        return [OrderService.to_order_out(o) for o in orders]

    @staticmethod
    def get_order_detail(db: Session, user: User, order_id: int) -> OrderOut:
        o = OrderService._base_query(db).filter(Order.order_id == order_id).first()

        if not o:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

        if user.role == "customer":
            if not user.customer or o.customer_id != user.customer.customer_id:
                raise HTTPException(status_code=403, detail="Bạn không có quyền xem đơn hàng này")

        return OrderService.to_order_out(o)

    @staticmethod
    def create_order(db: Session, user: User, req: OrderCreate) -> OrderOut:
        customer_id = user.customer.customer_id
        pickup_time = _validate_pickup_time(req.pickup_time)
        merged = _merge_items(req)
        if not merged:
            raise HTTPException(status_code=400, detail="Đơn hàng phải có ít nhất 1 sản phẩm bánh")

        total_cost = Decimal("0.0")
        total_quantity = 0
        items_to_save = []

        # Khóa dòng tồn kho (SELECT ... FOR UPDATE) tới khi commit để 2 đơn đồng thời không cùng trừ một lượng tồn;
        # duyệt theo thứ tự khóa cố định để tránh deadlock giữa các giao dịch
        for (product_id, size_id), line in sorted(merged.items()):
            ps = ProductService.get_sellable_size(db, product_id, size_id, line["quantity"], lock=True)

            ps.stock_quantity -= line["quantity"]
            total_cost += ps.price * line["quantity"]
            total_quantity += line["quantity"]

            items_to_save.append({
                "product_id": product_id,
                "size_id": size_id,
                "quantity": line["quantity"],
                "price": ps.price,
                "note": "; ".join(line["notes"]) or None,
            })

        discount_amount = Decimal("0.0")
        if req.promotion_id:
            discount_amount = PromotionService.calculate_discount(db, req.promotion_id, customer_id, total_cost)

        final_cost = max(total_cost - discount_amount, Decimal("0.0"))
        order_code = f"DH{datetime.now().strftime('%Y%m%d%H%M')}{random.randint(10, 99)}"

        new_order = Order(
            order_code=order_code,
            customer_id=customer_id,
            recipient_name=req.recipient_name,
            recipient_phone=req.recipient_phone,
            pickup_time=pickup_time,
            notes=req.notes,
            promotion_id=req.promotion_id,
            discount_amount=discount_amount,
            total_quantity=total_quantity,
            total_cost=total_cost,
            final_cost=final_cost,
            payment_method=req.payment_method,
            payment_status="Unpaid",
            status="Pending",
        )
        db.add(new_order)
        db.flush()

        for item in items_to_save:
            db.add(OrderDetail(order_id=new_order.order_id, **item))

        # Lưu voucher đã áp dụng vào bảng order_promotions (Web cũng ghi bảng này)
        if req.promotion_id:
            db.add(OrderPromotion(
                order_id=new_order.order_id,
                promotion_id=req.promotion_id,
                discount_amount=discount_amount,
            ))

        db.add(OrderStatusLog(
            order_id=new_order.order_id,
            changed_by=user.user_name,
            old_status=None,
            new_status="Pending",
            note="Đơn hàng được đặt thành công, chờ xác nhận",
        ))

        # Xóa các món đã đặt khỏi giỏ hàng
        for item in items_to_save:
            db.query(Cart).filter(
                Cart.customer_id == customer_id,
                Cart.product_id == item["product_id"],
                Cart.size_id == item["size_id"]
            ).delete()

        notif = Notification(
            phone=user.phone,
            title="Đặt hàng thành công",
            message=f"Đơn hàng #{order_code} đã được tiếp nhận và đang chờ xác nhận.",
            type="order",
            reference_id=new_order.order_id,
        )
        db.add(notif)
        db.commit()
        db.refresh(new_order)

        ordered_pairs = [(item["product_id"], item["size_id"]) for item in items_to_save]
        RealtimeService.to_user(user.phone, "new_notification", {
            "title": notif.title,
            "message": notif.message,
            "order_id": new_order.order_id,
            "order_code": order_code,
        })
        RealtimeService.to_user(user.phone, "cart_updated")
        RealtimeService.to_staff("new_order", {
            "order_id": new_order.order_id,
            "order_code": order_code,
            "recipient_name": new_order.recipient_name,
            "final_cost": float(final_cost),
            "source": "mobile",
        })
        RealtimeService.stock_changed(db, ordered_pairs)

        return OrderService.to_order_out(new_order)

    @staticmethod
    def update_status(db: Session, user: User, order_id: int, new_status: str, note: str = "") -> None:
        if new_status not in VALID_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Trạng thái không hợp lệ. Các trạng thái hợp lệ: {', '.join(VALID_STATUSES)}"
            )

        o = db.query(Order).filter(Order.order_id == order_id).first()
        if not o:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

        old_status = o.status
        o.status = new_status

        if new_status == "Completed":
            o.payment_status = "Paid"

        db.add(OrderStatusLog(
            order_id=o.order_id,
            changed_by=user.user_name,
            old_status=old_status,
            new_status=new_status,
            note=note or f"Chuyển trạng thái sang {new_status}",
        ))

        customer_user = o.customer.user if o.customer else None
        notif = None
        if customer_user:
            notif = Notification(
                phone=customer_user.phone,
                title=f"Đơn hàng #{o.order_code} đã cập nhật",
                message=f"Trạng thái đơn hàng đổi thành: {new_status}. {note}",
                type="order",
                reference_id=o.order_id,
            )
            db.add(notif)
        db.commit()

        if customer_user and notif:
            RealtimeService.to_user(customer_user.phone, "order_status_updated", {
                "title": notif.title,
                "message": notif.message,
                "order_id": o.order_id,
                "order_code": o.order_code,
                "old_status": old_status,
                "new_status": new_status,
            })
        RealtimeService.to_staff("order_updated", {"order_id": o.order_id, "status": new_status})

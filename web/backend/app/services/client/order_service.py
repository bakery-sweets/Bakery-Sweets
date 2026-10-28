import uuid
from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.exceptions import BadRequestError, NotFoundError
from thesweets_common.models.order import Order, OrderDetail, Cart, OrderStatusLog
from thesweets_common.models.product import ProductSize
from thesweets_common.models.promotion import OrderPromotion
from app.schemas.client.order import CheckoutRequest
from app.services.client.promotion_service import ClientPromotionService
from app.services.realtime_service import RealtimeService

# Giờ hẹn lấy bánh do client gửi là giờ địa phương (Việt Nam, UTC+7, không có giờ mùa hè)
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
        raise BadRequestError("Giờ lấy bánh phải ở thời điểm sau hiện tại")
    if pickup_time > now + PICKUP_MAX_AHEAD:
        raise BadRequestError("Chỉ nhận đặt bánh trước tối đa 30 ngày")
    return pickup_time

class ClientOrderService:
    @staticmethod
    def create_order(db: Session, customer_id: int, data: CheckoutRequest) -> Order:
        pickup_time = _validate_pickup_time(data.pickup_time)
        order_code = f"DH{uuid.uuid4().hex[:6].upper()}"

        if data.items:
            items_source = data.items
        else:
            items_source = db.query(Cart).filter(Cart.customer_id == customer_id).all()

        # order_detail có khóa chính (order_id, product_id, size_id) nên gộp các dòng trùng
        merged: dict[tuple[int, int], int] = {}
        for item in items_source:
            key = (item.product_id, item.size_id)
            merged[key] = merged.get(key, 0) + item.quantity

        if not merged:
            raise BadRequestError("Giỏ hàng đang trống")

        total_quantity = 0
        total_cost = Decimal("0.00")
        details_to_create = []

        # Kiểm tra sự tồn tại của sản phẩm và số lượng tồn kho.
        # Khóa dòng tồn kho (SELECT ... FOR UPDATE) tới khi commit để 2 đơn đồng thời không cùng trừ một lượng tồn;
        # duyệt theo thứ tự khóa cố định để tránh deadlock giữa các giao dịch
        for (product_id, size_id), quantity in sorted(merged.items()):
            ps = db.query(ProductSize).filter(
                ProductSize.product_id == product_id,
                ProductSize.size_id == size_id
            ).with_for_update().first()
            if not ps:
                raise BadRequestError(f"Sản phẩm #{product_id} không có kích cỡ #{size_id}")

            if ps.product and ps.product.status != "Available":
                raise BadRequestError(
                    f"Sản phẩm '{ps.product.product_name}' hiện không còn kinh doanh, vui lòng xóa khỏi giỏ hàng",
                )

            if ps.stock_quantity < quantity:
                p_name = ps.product.product_name if ps.product else f"#{product_id}"
                s_name = ps.size.size_name if ps.size else f"#{size_id}"
                raise BadRequestError(
                    f"Sản phẩm '{p_name}' ({s_name}) chỉ còn {ps.stock_quantity} cái trong kho, không đủ số lượng yêu cầu ({quantity})",
                )

            total_quantity += quantity
            total_cost += ps.price * quantity
            details_to_create.append({
                "ps_ref": ps,
                "product_id": product_id,
                "size_id": size_id,
                "quantity": quantity,
                "price": ps.price,
            })

        # Xử lý áp dụng voucher khuyến mãi nếu có
        discount_amount = Decimal("0.00")
        applied_promo = None
        if data.voucher_code and data.voucher_code.strip():
            applied_promo, discount_amount = ClientPromotionService.calculate_discount(
                db=db,
                code=data.voucher_code.strip(),
                total_amount=total_cost,
                customer_id=customer_id,
            )

        final_cost = max(Decimal("0.00"), total_cost - discount_amount)

        order = Order(
            order_code=order_code,
            customer_id=customer_id,
            recipient_name=data.recipient_name,
            recipient_phone=data.recipient_phone,
            pickup_time=pickup_time,
            notes=data.notes,
            promotion_id=applied_promo.promotion_id if applied_promo else None,
            discount_amount=discount_amount,
            total_quantity=total_quantity,
            total_cost=total_cost,
            final_cost=final_cost,
            payment_method=data.payment_method,
            payment_status="Unpaid",
            status="Pending",
        )
        db.add(order)
        db.flush()

        for d in details_to_create:
            # Trừ số lượng tồn kho
            ps = d["ps_ref"]
            ps.stock_quantity -= d["quantity"]

            db.add(OrderDetail(
                order_id=order.order_id,
                product_id=d["product_id"],
                size_id=d["size_id"],
                quantity=d["quantity"],
                price=d["price"],
            ))

        # Lưu thông tin voucher đã áp dụng vào bảng order_promotions
        if applied_promo:
            db.add(OrderPromotion(
                order_id=order.order_id,
                promotion_id=applied_promo.promotion_id,
                discount_amount=discount_amount,
            ))

        # Log trạng thái khởi tạo
        db.add(OrderStatusLog(
            order_id=order.order_id,
            changed_by="Hệ thống",
            old_status=None,
            new_status="Pending",
            note="Khách hàng tạo đơn hàng mới",
        ))

        # Xóa giỏ hàng sau khi đặt thành công (nếu đặt từ giỏ hàng hoặc gộp toàn bộ)
        if not data.items:
            db.query(Cart).filter(Cart.customer_id == customer_id).delete()
        else:
            # Nếu đặt từ danh sách items cụ thể, xóa các item tương ứng khỏi giỏ
            for (p_id, s_id) in merged.keys():
                db.query(Cart).filter(
                    Cart.customer_id == customer_id,
                    Cart.product_id == p_id,
                    Cart.size_id == s_id
                ).delete()

        db.commit()
        db.refresh(order)

        # Báo nhân viên có đơn mới, đồng bộ giỏ hàng các thiết bị khác của khách và tồn kho mới cho mọi người
        RealtimeService.to_staff("new_order", {
            "order_id": order.order_id,
            "order_code": order.order_code,
            "recipient_name": order.recipient_name,
            "final_cost": float(order.final_cost),
            "source": "web",
        })
        if order.customer:
            RealtimeService.to_user(order.customer.phone, "cart_updated")
        RealtimeService.stock_changed(db, merged.keys())
        return order

    @staticmethod
    def get_my_orders(db: Session, customer_id: int) -> List[Order]:
        return db.query(Order).filter(Order.customer_id == customer_id).order_by(Order.order_id.desc()).all()

    @staticmethod
    def get_order_by_id(db: Session, customer_id: int, order_id: int) -> Optional[Order]:
        return db.query(Order).filter(Order.order_id == order_id, Order.customer_id == customer_id).first()

    @staticmethod
    def cancel_order(db: Session, customer_id: int, order_id: int, note: Optional[str] = None) -> Order:
        order = db.query(Order).filter(
            Order.order_id == order_id, Order.customer_id == customer_id
        ).with_for_update().first()
        if not order:
            raise NotFoundError("Không tìm thấy đơn hàng này")

        if order.status != "Pending":
            raise BadRequestError(
                f"Không thể hủy đơn hàng ở trạng thái '{order.status}'. Chỉ có thể hủy đơn khi đang chờ xử lý (Pending)",
            )

        old_status = order.status
        order.status = "Cancelled"

        # Hoàn lại số lượng tồn kho cho các sản phẩm trong đơn
        for detail in order.details:
            ps = db.query(ProductSize).filter(
                ProductSize.product_id == detail.product_id,
                ProductSize.size_id == detail.size_id
            ).with_for_update().first()
            if ps:
                ps.stock_quantity += detail.quantity

        cancel_note = note or "Khách hàng hủy đơn hàng"
        db.add(OrderStatusLog(
            order_id=order.order_id,
            changed_by="Khách hàng",
            old_status=old_status,
            new_status="Cancelled",
            note=cancel_note,
        ))

        db.commit()
        db.refresh(order)

        RealtimeService.to_staff("order_updated", {"order_id": order.order_id, "status": order.status})
        RealtimeService.stock_changed(db, [(d.product_id, d.size_id) for d in order.details])
        return order

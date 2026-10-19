from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime
from decimal import Decimal
import random

from app.config.database import get_db
from app.models.user import User
from app.models.order import Order, OrderDetail, OrderStatusLog, Cart
from app.models.product import ProductSize
from app.models.promotion import Promotion, InvoicePromotion
from app.models.notification import Notification
from app.schemas.order import OrderCreate, OrderOut, OrderDetailOut, OrderStatusLogOut
from app.core.security import get_current_user
from app.websocket.manager import manager

router = APIRouter()

def _format_order_out(o: Order) -> OrderOut:
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

@router.post("/orders", response_model=OrderOut)
async def create_order(
    req: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.customer:
        raise HTTPException(status_code=400, detail="Người dùng chưa có thông tin khách hàng")

    customer_id = current_user.customer.customer_id
    if not req.items:
        raise HTTPException(status_code=400, detail="Đơn hàng phải có ít nhất 1 sản phẩm bánh")

    total_cost = Decimal("0.0")
    total_quantity = 0
    items_to_save = []

    for item in req.items:
        ps = db.query(ProductSize).filter(
            ProductSize.product_id == item.product_id,
            ProductSize.size_id == item.size_id
        ).with_for_update().first()

        if not ps:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy biến thể bánh cho món {item.product_id}")

        if ps.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Món {ps.product.product_name if ps.product else ''} chỉ còn {ps.stock_quantity} cái"
            )

        ps.stock_quantity -= item.quantity
        item_subtotal = ps.price * item.quantity
        total_cost += item_subtotal
        total_quantity += item.quantity

        items_to_save.append({
            "product_id": item.product_id,
            "size_id": item.size_id,
            "quantity": item.quantity,
            "price": ps.price,
            "note": item.note,
        })

    discount_amount = Decimal("0.0")
    if req.promotion_id:
        promo = db.query(Promotion).filter(Promotion.promotion_id == req.promotion_id).first()
        if not promo or promo.status != "Active":
            raise HTTPException(status_code=400, detail="Mã ưu đãi không hợp lệ hoặc đã hết hạn")

        now = datetime.now()
        if promo.start_date and promo.start_date > now:
            raise HTTPException(status_code=400, detail="Chương trình ưu đãi chưa bắt đầu")
        if promo.end_date and promo.end_date < now:
            raise HTTPException(status_code=400, detail="Chương trình ưu đãi đã kết thúc")

        # Kiểm tra giới hạn số lần sử dụng cho mỗi tài khoản
        limit_per_user = promo.usage_limit_per_user if promo.usage_limit_per_user is not None else 1
        user_used_count = db.query(Order).filter(
            Order.customer_id == customer_id,
            Order.promotion_id == req.promotion_id,
            Order.status != "Cancelled"
        ).count()
        if user_used_count >= limit_per_user:
            raise HTTPException(
                status_code=400,
                detail=f"Bạn đã sử dụng mã ưu đãi này rồi. Mỗi tài khoản chỉ được áp dụng tối đa {limit_per_user} lần!"
            )

        # Kiểm tra tổng số lượt sử dụng toàn hệ thống (nếu có giới hạn)
        if promo.total_usage_limit is not None and promo.total_usage_limit > 0:
            total_used_count = db.query(Order).filter(
                Order.promotion_id == req.promotion_id,
                Order.status != "Cancelled"
            ).count()
            if total_used_count >= promo.total_usage_limit:
                raise HTTPException(
                    status_code=400,
                    detail="Mã ưu đãi này đã hết lượt sử dụng trên hệ thống!"
                )

        inv_promo = db.query(InvoicePromotion).filter(
            InvoicePromotion.promotion_id == req.promotion_id,
            InvoicePromotion.min_order_value <= total_cost
        ).order_by(InvoicePromotion.min_order_value.desc()).first()

        if not inv_promo:
            raise HTTPException(
                status_code=400,
                detail="Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã ưu đãi này"
            )

        calculated_discount = total_cost * (inv_promo.discount_percentage / Decimal("100.0"))
        if inv_promo.max_discount_value and calculated_discount > inv_promo.max_discount_value:
            discount_amount = inv_promo.max_discount_value
        else:
            discount_amount = calculated_discount

    final_cost = total_cost - discount_amount
    if final_cost < 0:
        final_cost = Decimal("0.0")

    order_code = f"DH{datetime.now().strftime('%Y%m%d%H%M')}{random.randint(10, 99)}"

    new_order = Order(
        order_code=order_code,
        customer_id=customer_id,
        recipient_name=req.recipient_name,
        recipient_phone=req.recipient_phone,
        pickup_time=req.pickup_time,
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
        order_detail = OrderDetail(
            order_id=new_order.order_id,
            product_id=item["product_id"],
            size_id=item["size_id"],
            quantity=item["quantity"],
            price=item["price"],
            note=item["note"],
        )
        db.add(order_detail)

    initial_log = OrderStatusLog(
        order_id=new_order.order_id,
        changed_by=current_user.user_name,
        old_status=None,
        new_status="Pending",
        note="Đơn hàng được đặt thành công, chờ xác nhận",
    )
    db.add(initial_log)

    for item in items_to_save:
        db.query(Cart).filter(
            Cart.customer_id == customer_id,
            Cart.product_id == item["product_id"],
            Cart.size_id == item["size_id"]
        ).delete()

    notif = Notification(
        user_name=current_user.user_name,
        title="Đặt hàng thành công",
        message=f"Đơn hàng #{order_code} đã được tiếp nhận và đang chờ xác nhận.",
        type="order",
        reference_id=new_order.order_id,
    )
    db.add(notif)
    db.commit()
    db.refresh(new_order)

    await manager.send_to_user(current_user.user_name, {
        "event": "new_notification",
        "title": notif.title,
        "message": notif.message,
        "order_id": new_order.order_id,
        "order_code": order_code,
    })

    return _format_order_out(new_order)

@router.get("/orders", response_model=List[OrderOut])
def get_my_orders(
    status: str = "All",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Order).options(
        joinedload(Order.details).joinedload(OrderDetail.product),
        joinedload(Order.details).joinedload(OrderDetail.size),
        joinedload(Order.status_logs),
    )

    if current_user.role == "customer":
        customer_id = current_user.customer.customer_id if current_user.customer else -1
        query = query.filter(Order.customer_id == customer_id)

    if status and status != "All":
        query = query.filter(Order.status == status)

    orders = query.order_by(Order.order_id.desc()).all()
    return [_format_order_out(o) for o in orders]

@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order_detail(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    o = db.query(Order).options(
        joinedload(Order.details).joinedload(OrderDetail.product),
        joinedload(Order.details).joinedload(OrderDetail.size),
        joinedload(Order.status_logs),
    ).filter(Order.order_id == order_id).first()

    if not o:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    if current_user.role == "customer":
        if not current_user.customer or o.customer_id != current_user.customer.customer_id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền xem đơn hàng này")

    return _format_order_out(o)

@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    new_status: str,
    note: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    valid_statuses = ["Pending", "Processing", "Ready", "Completed", "Cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail="Trạng thái không hợp lệ. Các trạng thái hợp lệ: Pending, Processing, Ready, Completed, Cancelled"
        )

    o = db.query(Order).filter(Order.order_id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    old_status = o.status
    o.status = new_status

    if new_status == "Completed":
        o.payment_status = "Paid"

    log = OrderStatusLog(
        order_id=o.order_id,
        changed_by=current_user.user_name,
        old_status=old_status,
        new_status=new_status,
        note=note or f"Chuyển trạng thái sang {new_status}",
    )
    db.add(log)

    customer_user = o.customer.user if o.customer else None
    if customer_user:
        notif = Notification(
            user_name=customer_user.user_name,
            title=f"Đơn hàng #{o.order_code} đã cập nhật",
            message=f"Trạng thái đơn hàng đổi thành: {new_status}. {note}",
            type="order",
            reference_id=o.order_id,
        )
        db.add(notif)
        db.commit()

        await manager.send_to_user(customer_user.user_name, {
            "event": "new_notification",
            "title": notif.title,
            "message": notif.message,
            "order_id": o.order_id,
            "status": new_status,
        })
    else:
        db.commit()

    await manager.broadcast_order_update(o.order_id, {
        "event": "order_status_updated",
        "order_id": o.order_id,
        "old_status": old_status,
        "new_status": new_status,
        "note": note,
        "timestamp": datetime.now().isoformat(),
    })

    return {"message": "Cập nhật trạng thái thành công", "new_status": new_status}

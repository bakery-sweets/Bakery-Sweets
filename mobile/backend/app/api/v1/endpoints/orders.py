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
from app.models.promotion import InvoicePromotion
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
        emp_name = None
        if log.employee:
            emp_name = f"{log.employee.first_name} {log.employee.last_name}"
        log_list.append(OrderStatusLogOut(
            log_id=log.log_id,
            old_status=log.old_status,
            new_status=log.new_status,
            note=log.note,
            changed_at=log.changed_at,
            employee_name=emp_name,
        ))

    confirmed_by = None
    if o.employee:
        confirmed_by = f"{o.employee.first_name} {o.employee.last_name}"

    delivered_by = None
    if o.shipper:
        delivered_by = f"{o.shipper.first_name} {o.shipper.last_name}"

    return OrderOut(
        order_id=o.order_id,
        order_code=o.order_code,
        customer_id=o.customer_id,
        recipient_name=o.recipient_name,
        recipient_phone=o.recipient_phone,
        shipping_address=o.shipping_address,
        shipping_city=o.shipping_city,
        shipping_district=o.shipping_district,
        shipping_ward=o.shipping_ward,
        delivery_date=o.delivery_date,
        delivery_time=o.delivery_time,
        shipping_fee=o.shipping_fee,
        discount_amount=o.discount_amount,
        total_quantity=o.total_quantity,
        total_cost=o.total_cost,
        final_cost=o.final_cost,
        payment_method=o.payment_method,
        payment_status=o.payment_status,
        status=o.status,
        order_date=o.order_date,
        confirmed_by=confirmed_by,
        delivered_by=delivered_by,
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
        inv_promo = db.query(InvoicePromotion).filter(
            InvoicePromotion.promotion_id == req.promotion_id,
            InvoicePromotion.min_order_value <= total_cost
        ).order_by(InvoicePromotion.min_order_value.desc()).first()

        if inv_promo:
            calculated_discount = total_cost * (inv_promo.discount_percentage / Decimal("100.0"))
            if inv_promo.max_discount_value and calculated_discount > inv_promo.max_discount_value:
                discount_amount = inv_promo.max_discount_value
            else:
                discount_amount = calculated_discount

    shipping_fee = Decimal("25000.00") if total_cost < 300000 else Decimal("0.0")
    final_cost = total_cost + shipping_fee - discount_amount
    if final_cost < 0:
        final_cost = Decimal("0.0")

    order_code = f"DH{datetime.now().strftime('%Y%m%d%H%M')}{random.randint(10, 99)}"

    new_order = Order(
        order_code=order_code,
        customer_id=customer_id,
        recipient_name=req.recipient_name,
        recipient_phone=req.recipient_phone,
        shipping_address=req.shipping_address,
        shipping_city=req.shipping_city,
        shipping_district=req.shipping_district,
        shipping_ward=req.shipping_ward,
        delivery_date=req.delivery_date,
        delivery_time=req.delivery_time,
        shipping_fee=shipping_fee,
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
        old_status=None,
        new_status="Pending",
        note="Đơn hàng được tạo mới bởi khách hàng",
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
        joinedload(Order.status_logs).joinedload(OrderStatusLog.employee),
        joinedload(Order.employee),
        joinedload(Order.shipper),
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
        joinedload(Order.status_logs).joinedload(OrderStatusLog.employee),
        joinedload(Order.employee),
        joinedload(Order.shipper),
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
    shipper_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    valid_statuses = ["Pending", "Processing", "Shipping", "Completed", "Cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ")

    o = db.query(Order).filter(Order.order_id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    old_status = o.status
    o.status = new_status

    emp_id = None
    if current_user.employee:
        emp_id = current_user.employee.employee_id
        if not o.employee_id and new_status == "Processing":
            o.employee_id = emp_id

    if shipper_id:
        o.shipper_id = shipper_id

    if new_status == "Completed":
        o.payment_status = "Paid"

    log = OrderStatusLog(
        order_id=o.order_id,
        employee_id=emp_id,
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

import secrets
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
# Khách chưa có tài khoản: tạo tài khoản ẩn theo SĐT, khách tự đăng ký sau sẽ nhận lại (xem app/core/guest_account.py)
from app.core.guest_account import WALK_IN_PHONE, guest_email, is_guest_account
from app.models.order import Order, OrderDetail, OrderStatusLog
from app.models.product import ProductSize
from app.models.promotion import OrderPromotion
from app.models.notification import Notification
from app.models.user import User, Customer
from app.schemas.admin.order import AdminOrderCreate
from app.services.client.order_service import VN_TZ, _validate_pickup_time
from app.services.client.promotion_service import ClientPromotionService
from app.services.realtime_service import RealtimeService



def _full_name(c: Customer) -> str:
    # Quy ước của dự án: first_name lưu Họ, last_name lưu Tên đệm + Tên (VD: "Nguyễn" + "Văn An")
    return f"{c.first_name} {c.last_name}".strip()


def _split_name(full_name: str) -> Tuple[str, str]:
    """Tách "Nguyễn Văn An" thành (first_name="Nguyễn", last_name="Văn An") theo quy ước của dự án."""
    parts = full_name.split()
    if len(parts) < 2:
        return "", full_name.strip()
    return parts[0], " ".join(parts[1:])


# Các bước chuyển trạng thái hợp lệ; Completed và Cancelled là trạng thái cuối
ALLOWED_TRANSITIONS = {
    "Pending": ("Processing", "Cancelled"),
    "Processing": ("Ready", "Cancelled"),
    "Ready": ("Completed", "Cancelled"),
    "Completed": (),
    "Cancelled": (),
}

# Đơn chưa xong, khách vẫn có thể gọi để hỏi / đổi
ACTIVE_STATUSES = ("Pending", "Processing", "Ready")

# Tên trạng thái hiển thị cho khách trong thông báo
STATUS_LABELS = {
    "Pending": "Chờ xác nhận",
    "Processing": "Đang chuẩn bị bánh",
    "Ready": "Bánh đã sẵn sàng, mời bạn tới quầy nhận",
    "Completed": "Đã hoàn tất",
    "Cancelled": "Đã bị hủy",
}

class AdminOrderService:
    @staticmethod
    def get_all(db: Session, status: Optional[str] = None) -> List[Order]:
        query = db.query(Order)
        if status and status != "all":
            query = query.filter(Order.status == status)
        return query.order_by(Order.order_id.desc()).all()

    @staticmethod
    def get_by_id(db: Session, order_id: int) -> Optional[Order]:
        return db.query(Order).filter(Order.order_id == order_id).first()

    @staticmethod
    def update_status(db: Session, order_id: int, new_status: str, changed_by: str, note: Optional[str] = None) -> Optional[Order]:
        order = db.query(Order).filter(Order.order_id == order_id).with_for_update().first()
        if not order:
            return None

        old_status = order.status
        if new_status not in ALLOWED_TRANSITIONS.get(old_status, ()):
            raise HTTPException(
                status_code=400,
                detail=f"Không thể chuyển đơn hàng từ '{old_status}' sang '{new_status}'",
            )

        note = note.strip() if note else None

        if new_status == "Cancelled":
            if not note:
                raise HTTPException(status_code=400, detail="Vui lòng nhập lý do hủy đơn hàng")
            # Hoàn lại tồn kho cho các sản phẩm trong đơn
            for detail in order.details:
                ps = db.query(ProductSize).filter(
                    ProductSize.product_id == detail.product_id,
                    ProductSize.size_id == detail.size_id
                ).with_for_update().first()
                if ps:
                    ps.stock_quantity += detail.quantity

        if new_status == "Completed" and order.payment_status != "Paid":
            if order.payment_method != "COD":
                raise HTTPException(
                    status_code=400,
                    detail="Đơn hàng chưa được xác nhận thanh toán, không thể hoàn tất",
                )
            # Đơn COD: khách trả tiền mặt khi nhận bánh tại quầy
            order.payment_status = "Paid"
            note = f"{note} · Đã thu tiền mặt" if note else "Đã thu tiền mặt khi giao bánh"

        order.status = new_status
        db.add(OrderStatusLog(
            order_id=order.order_id,
            changed_by=changed_by,
            old_status=old_status,
            new_status=new_status,
            note=note,
        ))

        # Lưu thông báo cho khách (hiện trong mục Thông báo của App) rồi đẩy realtime
        customer_phone = order.customer.phone if order.customer else None
        notif = None
        if customer_phone:
            message = f"Đơn hàng #{order.order_code}: {STATUS_LABELS.get(new_status, new_status)}."
            if note:
                message += f" Ghi chú: {note}"
            notif = Notification(
                phone=customer_phone,
                title=f"Đơn hàng #{order.order_code} đã cập nhật",
                message=message,
                type="order",
                reference_id=order.order_id,
            )
            db.add(notif)

        db.commit()
        db.refresh(order)

        if notif:
            RealtimeService.to_user(customer_phone, "order_status_updated", {
                "title": notif.title,
                "message": notif.message,
                "order_id": order.order_id,
                "order_code": order.order_code,
                "old_status": old_status,
                "new_status": new_status,
            })
        RealtimeService.to_staff("order_updated", {"order_id": order.order_id, "status": new_status})
        if new_status == "Cancelled":
            RealtimeService.stock_changed(db, [(d.product_id, d.size_id) for d in order.details])
        return order

    @staticmethod
    def confirm_payment(db: Session, order_id: int, changed_by: str, note: Optional[str] = None) -> Optional[Order]:
        order = db.query(Order).filter(Order.order_id == order_id).with_for_update().first()
        if not order:
            return None

        if order.status == "Cancelled":
            raise HTTPException(status_code=400, detail="Không thể xác nhận thanh toán cho đơn hàng đã hủy")
        if order.payment_status != "Unpaid":
            raise HTTPException(status_code=400, detail=f"Đơn hàng đang ở trạng thái thanh toán '{order.payment_status}'")

        order.payment_status = "Paid"
        # Trạng thái đơn không đổi, ghi log để hiện trên timeline
        db.add(OrderStatusLog(
            order_id=order.order_id,
            changed_by=changed_by,
            old_status=order.status,
            new_status=order.status,
            note=(note.strip() if note and note.strip() else None) or "Xác nhận đã thanh toán",
        ))
        db.commit()
        db.refresh(order)

        # Trạng thái thanh toán đổi: các màn hình đơn hàng tự tải lại, không cần hiện thông báo
        if order.customer:
            RealtimeService.to_user(order.customer.phone, "order_updated", {"order_id": order.order_id})
        RealtimeService.to_staff("order_updated", {"order_id": order.order_id, "status": order.status})
        return order

    # ===== Tạo đơn tại quầy (POS) =====

    @staticmethod
    def lookup_customer(db: Session, phone: str) -> dict:
        c = db.query(Customer).filter(Customer.phone == phone).first()
        if not c:
            return {"found": False, "phone": phone}
        # Lịch sử đơn để nhân viên nhận đơn qua điện thoại biết khách hay hủy / đang có đơn dở (tránh tạo trùng)
        by_status = dict(
            db.query(Order.status, func.count(Order.order_id))
            .filter(Order.customer_id == c.customer_id)
            .group_by(Order.status)
            .all()
        )
        user = c.user
        return {
            "found": True,
            "customer_id": c.customer_id,
            "recipient_name": _full_name(c),
            "phone": c.phone,
            "has_account": user is not None and not is_guest_account(user),
            "is_locked": bool(user and user.status == "locked"),
            "lock_reason": user.lock_reason if user and user.status == "locked" else None,
            "order_count": sum(by_status.values()),
            "cancelled_count": by_status.get("Cancelled", 0),
            "active_order_count": sum(by_status.get(s, 0) for s in ACTIVE_STATUSES),
        }

    @staticmethod
    def _get_or_create_customer(db: Session, phone: str, full_name: str) -> Tuple[Customer, bool]:
        """
        Lấy hồ sơ khách theo SĐT, chưa có thì tạo mới.
        Trả về (customer, has_real_account): has_real_account = khách tự đăng ký tài khoản (không phải tài khoản tại quầy).
        """
        customer = db.query(Customer).filter(Customer.phone == phone).first()
        if customer:
            return customer, not is_guest_account(customer.user)
        if phone == WALK_IN_PHONE:
            full_name = "Khách vãng lai"

        first_name, last_name = _split_name(full_name)
        user = db.query(User).filter(User.phone == phone).first()
        has_real_account = user is not None and not is_guest_account(user)
        try:
            # Savepoint: 2 quầy cùng tạo khách cho 1 SĐT mới thì bên chậm hơn lấy lại bản ghi vừa được tạo
            with db.begin_nested():
                if not user:
                    user = User(
                        phone=phone,
                        email=guest_email(phone),
                        # Mật khẩu ngẫu nhiên không ai biết: tài khoản chỉ dùng để gắn đơn hàng
                        password=get_password_hash(secrets.token_urlsafe(24)),
                        role="customer",
                        status="active",
                    )
                    db.add(user)
                    db.flush()
                # SĐT đã có tài khoản (VD: nhân viên) nhưng chưa có hồ sơ khách: chỉ bổ sung hồ sơ
                customer = Customer(phone=phone, first_name=first_name, last_name=last_name)
                db.add(customer)
                db.flush()
        except IntegrityError:
            customer = db.query(Customer).filter(Customer.phone == phone).first()
            if not customer:
                raise HTTPException(status_code=409, detail="Không tạo được hồ sơ khách hàng, vui lòng thử lại")
            return customer, not is_guest_account(customer.user)
        return customer, has_real_account

    @staticmethod
    def check_voucher(db: Session, code: str, order_amount: Decimal, phone: Optional[str] = None):
        """Tính thử mức giảm của mã cho khách tại quầy (giới hạn lượt dùng tính theo SĐT khách, không theo nhân viên)."""
        c = None
        if phone and phone != WALK_IN_PHONE:
            c = db.query(Customer).filter(Customer.phone == phone).first()
        return ClientPromotionService.calculate_discount(
            db=db,
            code=code,
            total_amount=order_amount,
            customer_id=c.customer_id if c else None,
        )

    @staticmethod
    def create_order(db: Session, data: AdminOrderCreate, staff_user: User) -> Order:
        is_phone = data.order_type == "phone"
        is_immediate = data.order_type == "immediate"
        if is_phone and data.recipient_phone == WALK_IN_PHONE:
            raise HTTPException(status_code=400, detail="Đơn đặt qua điện thoại cần số điện thoại thật của khách để liên hệ")

        if is_immediate:
            # Khách nhận bánh ngay tại quầy: giờ lấy bánh chính là lúc tạo đơn (giờ Việt Nam)
            pickup_time = datetime.now(VN_TZ).replace(tzinfo=None)
        else:
            pickup_time = _validate_pickup_time(data.pickup_time)

        customer, has_real_account = AdminOrderService._get_or_create_customer(
            db, data.recipient_phone, data.recipient_name
        )

        # order_detail có khóa chính (order_id, product_id, size_id) nên gộp các dòng trùng
        merged: dict[Tuple[int, int], int] = {}
        quoted_prices: dict[Tuple[int, int], Decimal] = {}
        for item in data.items:
            key = (item.product_id, item.size_id)
            merged[key] = merged.get(key, 0) + item.quantity
            quoted_prices[key] = item.price

        total_quantity = 0
        total_cost = Decimal("0.00")
        lines = []

        # Khóa dòng tồn kho tới khi commit (SELECT ... FOR UPDATE); duyệt theo thứ tự cố định để tránh deadlock
        for (product_id, size_id), quantity in sorted(merged.items()):
            ps = db.query(ProductSize).filter(
                ProductSize.product_id == product_id,
                ProductSize.size_id == size_id,
            ).with_for_update().first()
            if not ps:
                raise HTTPException(status_code=400, detail=f"Sản phẩm #{product_id} không có kích cỡ #{size_id}")

            p_name = ps.product.product_name if ps.product else f"#{product_id}"
            s_name = ps.size.size_name if ps.size else f"#{size_id}"

            if not ps.product or ps.product.status != "Available":
                raise HTTPException(status_code=400, detail=f"Sản phẩm '{p_name}' hiện không còn kinh doanh")

            if ps.stock_quantity < quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Sản phẩm '{p_name}' ({s_name}) chỉ còn {ps.stock_quantity} cái trong kho, không đủ số lượng yêu cầu ({quantity})",
                )

            # Luôn tính tiền theo giá hiện hành trong DB; giá trên màn hình đã cũ thì báo để nhân viên báo lại khách
            if quoted_prices[(product_id, size_id)] != ps.price:
                raise HTTPException(
                    status_code=400,
                    detail=f"Giá '{p_name}' ({s_name}) vừa thay đổi thành {ps.price:,.0f}đ, vui lòng kiểm tra lại đơn",
                )

            total_quantity += quantity
            total_cost += ps.price * quantity
            lines.append((ps, quantity))

        discount_amount = Decimal("0.00")
        applied_promo = None
        if data.voucher_code:
            applied_promo, discount_amount = ClientPromotionService.calculate_discount(
                db=db,
                code=data.voucher_code,
                total_amount=total_cost,
                # Hồ sơ vãng lai dùng chung cho mọi khách lẻ: không áp giới hạn lượt/khách (vẫn áp tổng lượt toàn hệ thống)
                customer_id=None if data.recipient_phone == WALK_IN_PHONE else customer.customer_id,
            )
        final_cost = max(Decimal("0.00"), total_cost - discount_amount)

        if is_phone:
            # Nhân viên đã đọc lại & chốt đơn với khách trong cuộc gọi: bỏ qua bước "Chờ tiếp nhận"
            status, payment_status = "Processing", data.payment_status
            log_note = "Nhân viên nhận đơn qua điện thoại và đã xác nhận với khách"
        elif is_immediate:
            status, payment_status = "Completed", "Paid"
            log_note = "Nhân viên tạo đơn và giao bánh trực tiếp tại quầy"
        else:
            status, payment_status = "Pending", data.payment_status
            log_note = "Nhân viên tạo đơn đặt trước cho khách"

        order = Order(
            order_code=f"DH{uuid.uuid4().hex[:6].upper()}",
            customer_id=customer.customer_id,
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
            payment_status=payment_status,
            status=status,
        )
        db.add(order)
        db.flush()

        for ps, quantity in lines:
            ps.stock_quantity -= quantity
            db.add(OrderDetail(
                order_id=order.order_id,
                product_id=ps.product_id,
                size_id=ps.size_id,
                quantity=quantity,
                price=ps.price,
            ))

        if applied_promo:
            db.add(OrderPromotion(
                order_id=order.order_id,
                promotion_id=applied_promo.promotion_id,
                discount_amount=discount_amount,
            ))

        db.add(OrderStatusLog(
            order_id=order.order_id,
            changed_by=staff_user.phone,
            old_status=None,
            new_status=status,
            note=log_note,
        ))

        # Đơn qua điện thoại: khách có tài khoản nhận xác nhận bằng văn bản trong mục Thông báo của App / Web
        notif = None
        if is_phone and has_real_account:
            money = f"{final_cost:,.0f}".replace(",", ".")
            pay_text = "Đã thanh toán." if payment_status == "Paid" else (
                "Thanh toán khi nhận bánh." if data.payment_method in ("COD", "Credit Card") else "Đơn chưa được thanh toán."
            )
            notif = Notification(
                phone=customer.phone,
                title=f"Đơn hàng #{order.order_code} đã được xác nhận",
                message=(
                    f"Tiệm đã nhận đơn đặt qua điện thoại của bạn: {total_quantity} bánh, tổng {money}đ. "
                    f"Hẹn lấy bánh lúc {pickup_time:%H:%M %d/%m/%Y}. {pay_text}"
                ),
                type="order",
                reference_id=order.order_id,
            )
            db.add(notif)

        db.commit()
        db.refresh(order)

        if is_phone:
            # Đơn vào thẳng "Đang chuẩn bị": báo các máy nhân viên khác (có chuông); máy người tạo tự bỏ qua theo created_by
            RealtimeService.to_staff("new_order", {
                "order_id": order.order_id,
                "order_code": order.order_code,
                "recipient_name": order.recipient_name,
                "final_cost": float(order.final_cost),
                "source": "phone",
                "created_by": staff_user.phone,
            })
        else:
            RealtimeService.to_staff("order_updated", {"order_id": order.order_id, "status": order.status})
        RealtimeService.stock_changed(db, [(d.product_id, d.size_id) for d in order.details])

        if notif:
            RealtimeService.to_user(customer.phone, "order_status_updated", {
                "title": notif.title,
                "message": notif.message,
                "order_id": order.order_id,
                "order_code": order.order_code,
                "old_status": None,
                "new_status": order.status,
            })
        elif has_real_account:
            # Khách có tài khoản thật: màn hình đơn hàng trên App / Web của khách tự tải lại
            RealtimeService.to_user(customer.phone, "order_updated", {"order_id": order.order_id})
        return order

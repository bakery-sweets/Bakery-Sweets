import re
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta, timezone, time
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from thesweets_common.models.user import User
from thesweets_common.models.order import Order, OrderDetail, OrderStatusLog, Cart, PAYMENT_METHODS
from thesweets_common.models.product import ProductSize
from thesweets_common.models.promotion import OrderPromotion
from thesweets_common.pricing import PriceBook, release_single_use_voucher
from thesweets_common.order_code import generate_order_code
from thesweets_common.models.notification import Notification
from app.schemas.order import OrderCreate, OrderOut, OrderDetailOut, OrderStatusLogOut
from app.services.product_service import ProductService
from app.services.promotion_service import PromotionService
from app.services.realtime_service import RealtimeService

VALID_STATUSES = ["Pending", "Processing", "Ready", "Completed", "Cancelled"]

# Cùng luật với Web Backend (web/backend/app/services/admin/order_service.py):
# các bước chuyển trạng thái hợp lệ, Completed và Cancelled là trạng thái cuối
ALLOWED_TRANSITIONS = {
    "Pending": ("Processing", "Cancelled"),
    "Processing": ("Ready", "Cancelled"),
    "Ready": ("Completed", "Cancelled"),
    "Completed": (),
    "Cancelled": (),
}

# Kiểm tra dữ liệu đặt đơn giống Web Backend (schemas/client/order.py); trả lỗi dạng chuỗi để App hiện được
PHONE_PATTERN = re.compile(r"^0\d{9}$")
NOTES_MAX_LENGTH = 200
NOTES_MAX_WORDS = 50
NOTE_MAX_WORD_LENGTH = 25
MAX_QUANTITY_PER_LINE = 999


def _check_note(text: Optional[str], label: str) -> Optional[str]:
    if not text or not text.strip():
        return None
    text = text.strip()
    if len(text) > NOTES_MAX_LENGTH:
        raise BadRequestError(f"{label} không được vượt quá {NOTES_MAX_LENGTH} ký tự")
    words = text.split()
    if len(words) > NOTES_MAX_WORDS:
        raise BadRequestError(f"{label} không được chứa quá {NOTES_MAX_WORDS} chữ")
    if any(len(w) > NOTE_MAX_WORD_LENGTH for w in words):
        raise BadRequestError(f"{label} không được chứa từ quá dài")
    if re.search(r"(.)\1{4,}", text):
        raise BadRequestError(f"{label} không được chứa ký tự lặp lại nhiều lần")
    return text


def _validate_order_request(req: OrderCreate) -> Tuple[str, str, Optional[str]]:
    """Trả về (tên người nhận, SĐT người nhận, ghi chú) đã chuẩn hóa; sai thì báo lỗi rõ ràng."""
    name = " ".join((req.recipient_name or "").split())
    if len(name) < 2:
        raise BadRequestError("Vui lòng nhập họ tên người nhận (ít nhất 2 ký tự)")
    if len(name) > 100:
        raise BadRequestError("Họ tên người nhận không được vượt quá 100 ký tự")

    phone = re.sub(r"\s+", "", req.recipient_phone or "")
    if not PHONE_PATTERN.match(phone):
        raise BadRequestError("Số điện thoại người nhận phải gồm đúng 10 chữ số và bắt đầu bằng 0")

    if req.payment_method not in PAYMENT_METHODS:
        raise BadRequestError(f"Hình thức thanh toán không hợp lệ. Chọn một trong: {', '.join(PAYMENT_METHODS)}")

    # Số lượng 0 / âm từng lọt qua: số âm còn cộng ngược tồn kho và làm giảm tổng tiền
    for item in req.items:
        if item.quantity < 1:
            raise BadRequestError("Số lượng mỗi món phải từ 1 trở lên")
        if item.quantity > MAX_QUANTITY_PER_LINE:
            raise BadRequestError(f"Số lượng mỗi món tối đa {MAX_QUANTITY_PER_LINE}")
        _check_note(item.note, "Ghi chú món")

    return name, phone, _check_note(req.notes, "Ghi chú")



# Cùng luật với Web Backend: giờ hẹn lấy bánh là giờ Việt Nam (UTC+7), không ở quá khứ, tối đa 30 ngày tới
VN_TZ = timezone(timedelta(hours=7))
PICKUP_CLOCK_SKEW = timedelta(minutes=5)
PICKUP_MAX_AHEAD = timedelta(days=30)
# Giờ mở cửa của tiệm: giờ lấy bánh phải nằm trong khoảng này (đồng bộ với Web & App)
OPEN_TIME = time(7, 30)
CLOSE_TIME = time(21, 30)

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
    if not (OPEN_TIME <= pickup_time.time() <= CLOSE_TIME):
        raise BadRequestError(
            f"Giờ lấy bánh phải trong giờ mở cửa của tiệm ({OPEN_TIME:%H:%M} - {CLOSE_TIME:%H:%M})"
        )
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
                original_price=d.original_price,
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
            raise NotFoundError("Không tìm thấy đơn hàng")

        if user.role == "customer":
            if not user.customer or o.customer_id != user.customer.customer_id:
                raise ForbiddenError("Bạn không có quyền xem đơn hàng này")

        return OrderService.to_order_out(o)

    @staticmethod
    def create_order(db: Session, user: User, req: OrderCreate) -> OrderOut:
        customer_id = user.customer.customer_id
        if not req.items:
            raise BadRequestError("Đơn hàng phải có ít nhất 1 sản phẩm bánh")
        recipient_name, recipient_phone, notes = _validate_order_request(req)
        pickup_time = _validate_pickup_time(req.pickup_time)
        merged = _merge_items(req)
        for line in merged.values():
            # Gộp dòng trùng có thể vượt giới hạn / làm ghi chú dài quá
            if line["quantity"] > MAX_QUANTITY_PER_LINE:
                raise BadRequestError(f"Số lượng mỗi món tối đa {MAX_QUANTITY_PER_LINE}")
            _check_note("; ".join(line["notes"]), "Ghi chú món")

        total_cost = Decimal("0.0")
        total_quantity = 0
        items_to_save = []
        # Giá bán thực tế: đã trừ khuyến mãi theo sản phẩm
        price_book = PriceBook(db, [pid for pid, _ in merged])

        # Khóa dòng tồn kho (SELECT ... FOR UPDATE) tới khi commit để 2 đơn đồng thời không cùng trừ một lượng tồn;
        # duyệt theo thứ tự khóa cố định để tránh deadlock giữa các giao dịch
        for (product_id, size_id), line in sorted(merged.items()):
            ps = ProductService.get_sellable_size(db, product_id, size_id, line["quantity"], lock=True)

            q = price_book.quote_size(ps)
            ps.stock_quantity -= line["quantity"]
            total_cost += q.price * line["quantity"]
            total_quantity += line["quantity"]

            items_to_save.append({
                "product_id": product_id,
                "size_id": size_id,
                "quantity": line["quantity"],
                "price": q.price,
                "original_price": q.original_price,
                "note": "; ".join(line["notes"]) or None,
            })

        discount_amount = Decimal("0.0")
        if req.promotion_id:
            discount_amount = PromotionService.calculate_discount(db, req.promotion_id, customer_id, total_cost)

        final_cost = max(total_cost - discount_amount, Decimal("0.0"))
        # Cùng dạng mã với đơn đặt trên Web (DH + 6 ký tự hex), có kiểm tra trùng
        order_code = generate_order_code(db)

        new_order = Order(
            order_code=order_code,
            customer_id=customer_id,
            recipient_name=recipient_name,
            recipient_phone=recipient_phone,
            pickup_time=pickup_time,
            notes=notes,
            promotion_id=req.promotion_id,
            discount_amount=discount_amount,
            total_quantity=total_quantity,
            total_cost=total_cost,
            final_cost=final_cost,
            payment_method=req.payment_method,
            # Chuyển khoản là thanh toán mô phỏng: chọn là coi như đã thanh toán thành công
            payment_status="Paid" if req.payment_method == "Banking" else "Unpaid",
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
            raise BadRequestError(
                f"Trạng thái không hợp lệ. Các trạng thái hợp lệ: {', '.join(VALID_STATUSES)}"
            )

        # Khóa dòng đơn tới khi commit để 2 nhân viên không cùng đổi trạng thái 1 đơn
        o = db.query(Order).filter(Order.order_id == order_id).with_for_update().first()
        if not o:
            raise NotFoundError("Không tìm thấy đơn hàng")

        old_status = o.status
        if new_status not in ALLOWED_TRANSITIONS.get(old_status, ()):
            raise BadRequestError(f"Không thể chuyển đơn hàng từ '{old_status}' sang '{new_status}'")

        note = (note or "").strip()
        restocked = []
        if new_status == "Cancelled":
            if not note:
                raise BadRequestError("Vui lòng nhập lý do hủy đơn hàng")
            # Hoàn lại tồn kho các món trong đơn (khóa dòng tồn kho theo thứ tự cố định để tránh deadlock)
            for d in sorted(o.details, key=lambda d: (d.product_id, d.size_id)):
                ps = db.query(ProductSize).filter(
                    ProductSize.product_id == d.product_id,
                    ProductSize.size_id == d.size_id,
                ).with_for_update().first()
                if ps:
                    ps.stock_quantity += d.quantity
                    restocked.append((d.product_id, d.size_id))
            # Đơn dùng mã giảm giá 1 lần (đặt từ Web / tại quầy): trả mã lại cho khách
            released = release_single_use_voucher(db, o.order_id)
            if released:
                note = f"{note} · Hoàn lại mã giảm giá {released}"

        if new_status == "Completed" and o.payment_status != "Paid":
            if o.payment_method != "COD":
                raise BadRequestError("Đơn hàng chưa được xác nhận thanh toán, không thể hoàn tất")
            # Đơn COD: khách trả tiền mặt khi nhận bánh tại quầy
            o.payment_status = "Paid"
            note = f"{note} · Đã thu tiền mặt" if note else "Đã thu tiền mặt khi giao bánh"

        o.status = new_status

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
        if restocked:
            RealtimeService.stock_changed(db, restocked)

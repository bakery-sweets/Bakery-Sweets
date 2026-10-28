# Kiến trúc & luồng xử lý chức năng — The Sweets

Tài liệu này giúp bạn lần theo **bất kỳ chức năng nào** của hệ thống: người dùng bấm nút ở đâu → request đi qua những file nào → dữ liệu được ghi vào bảng nào → ai được báo realtime.

> Mẹo: mọi đường dẫn file trong tài liệu đều tính từ thư mục gốc repo. Tên hàm được ghi kèm để bạn tìm nhanh bằng `Ctrl+Shift+F`.

---

## Mục lục

1. [Bức tranh tổng thể](#1-bức-tranh-tổng-thể)
2. [Hai loại luồng: HTTP và Realtime](#2-hai-loại-luồng-http-và-realtime)
3. [Luồng HTTP đi qua những file nào](#3-luồng-http-đi-qua-những-file-nào)
4. [Luồng Realtime đi qua những file nào](#4-luồng-realtime-đi-qua-những-file-nào)
5. [Ví dụ đi từng bước](#5-ví-dụ-đi-từng-bước)
6. [Bản đồ toàn bộ chức năng](#6-bản-đồ-toàn-bộ-chức-năng)
7. [Danh sách sự kiện realtime](#7-danh-sách-sự-kiện-realtime)
8. [Phân quyền và xử lý lỗi](#8-phân-quyền-và-xử-lý-lỗi)
9. [Công thức dò một chức năng bất kỳ](#9-công-thức-dò-một-chức-năng-bất-kỳ)
10. [Thêm chức năng mới thì sửa những file nào](#10-thêm-chức-năng-mới-thì-sửa-những-file-nào)

---

## 1. Bức tranh tổng thể

Hệ thống theo kiến trúc **Client–Server nhiều tầng** (Chương 6 — *Client-server pattern* + *Layered architecture*):

```text
 TẦNG TRÌNH BÀY (Client)          TẦNG ỨNG DỤNG (Server)                         TẦNG DỮ LIỆU
┌───────────────────────┐ HTTP  ┌──────────────────────────┐
│ Web React      :3000  │──────▶│ web_backend      :5000   │───┐
│ (khách + quản trị)    │       │ /api/client, /api/admin  │   │
└──────────┬────────────┘       └────────────┬─────────────┘   │
           │ WebSocket                       │ báo sự kiện     │  SQL   ┌──────────────┐
           ├────────────────────▶┌───────────▼──────────────┐  ├───────▶│ MariaDB :3308│
           │                     │ realtime         :8001   │──┤        └──────────────┘
           │ WebSocket           │ /ws, /internal/events    │  │
┌──────────┴────────────┐        └───────────▲──────────────┘  │
│ App Flutter           │ HTTP  ┌────────────┴─────────────┐   │
│ (điện thoại)          │──────▶│ mobile_backend   :8000   │───┘
└───────────────────────┘   ▲   │ /api/v1                  │
                            │   └──────────────────────────┘
                   mobile_gateway :8080 (chỉ khi đi qua ngrok: /ws → realtime, còn lại → mobile_backend)
```

| Thư mục | Tầng | Vai trò |
| :--- | :--- | :--- |
| `web/frontend/` | Trình bày | Website React: trang khách (`src/client/`) và trang quản trị (`src/admin/`) |
| `mobile/frontend/` | Trình bày | App Flutter cho khách hàng |
| `web/backend/` | Ứng dụng | API cho website |
| `mobile/backend/` | Ứng dụng | API cho app |
| `realtime/` | Ứng dụng | Giữ kết nối WebSocket, đẩy sự kiện tới web và app |
| `gateway/` | Ứng dụng | Nginx, cổng vào duy nhất cho app khi dùng ngrok |
| `common/thesweets_common/models/` | Dữ liệu | ORM models (ánh xạ bảng) **dùng chung** cho cả 3 server Python |
| `database/` | Dữ liệu | `createTable.sql`, `data.sql`, `migrations/` |

**Quy tắc vàng:**

- Client **không bao giờ** đụng vào CSDL, chỉ gọi API.
- Hai backend **không gọi nhau**. Chúng chia sẻ dữ liệu qua **chung một CSDL** và chia sẻ sự kiện qua **chung một realtime server**.
- Vì vậy khách đặt hàng trên app (mobile_backend) thì admin trên web (web_backend) vẫn thấy ngay.

---

## 2. Hai loại luồng: HTTP và Realtime

Mỗi chức năng gồm 1 hoặc 2 luồng:

| | Luồng HTTP (đồng bộ) | Luồng Realtime (bất đồng bộ) |
| :--- | :--- | :--- |
| Ai khởi động | Người dùng bấm nút | Server, sau khi ghi CSDL thành công |
| Đi đâu | Client → backend → CSDL → trả kết quả cho **chính người bấm** | Backend → realtime → **những người khác** đang mở web/app |
| Người dùng có chờ không | Có (đợi response) | Không (gửi ở thread nền, lỗi cũng không ảnh hưởng nghiệp vụ) |
| Ví dụ | Khách đặt hàng → nhận "Đặt hàng thành công" | Admin đang mở trang Đơn hàng thấy đơn mới hiện lên |

Chức năng chỉ **đọc** dữ liệu (xem sản phẩm, xem đơn) thường chỉ có luồng HTTP. Chức năng **ghi** dữ liệu mà người khác cần biết (đặt đơn, đổi trạng thái, nhập kho, khóa tài khoản) có thêm luồng realtime.

---

## 3. Luồng HTTP đi qua những file nào

### 3.1. Sơ đồ chung (giống nhau cho mọi chức năng)

```text
[1] Giao diện ─▶ [2] Lớp gọi API ─▶ [3] Router ─▶ [4] Service ─▶ [5] Model/CSDL
   (page/screen)    (api/ hoặc provider)  (api/)       (services/)    (thesweets_common.models)
                                          │  ▲            │
                       deps.py (token,quyền)  schemas/ (kiểm tra dữ liệu)   └─▶ [6] RealtimeService (nếu cần báo)
                                          │
                                          └──▶ [7] Trả JSON về giao diện
```

### 3.2. Từng bước ứng với file nào

| Bước | Web (React → web_backend) | App (Flutter → mobile_backend) |
| :--- | :--- | :--- |
| **[1] Giao diện** | `web/frontend/src/client/pages/*.jsx`, `src/admin/pages/*.jsx` | `mobile/frontend/lib/features/<tên>/screens/*.dart` |
| **[2] Gọi API** | `src/api/client/index.js`, `src/api/admin/index.js` (giỏ hàng gọi qua `src/store/cartStore.js`) | `lib/features/<tên>/providers/*_provider.dart` dùng `ApiClient().dio` |
| Gắn token | `src/api/axiosClient.js`: URL `/admin/*` dùng token admin, còn lại dùng token khách | `lib/core/network/api_client.dart`: tự thêm `/api/v1` và token |
| Địa chỉ server | `src/api/config.js` (`VITE_API_URL`) | `lib/core/config/app_config.dart` (`BASE_URL` / `SERVER_HOST`) |
| **[3] Router** | `web/backend/app/api/admin/*.py`, `app/api/client/*.py` | `mobile/backend/app/api/v1/endpoints/*.py` |
| Gom router & prefix | `app/api/admin/api.py`, `app/api/client/api.py`, `main.py` | `app/api/v1/api.py`, `main.py` |
| Kiểm tra token, quyền | `app/api/deps.py` | `app/api/deps.py` |
| Kiểm tra dữ liệu vào/ra | `app/schemas/admin/*.py`, `app/schemas/client/*.py` | `app/schemas/*.py` |
| **[4] Nghiệp vụ** | `app/services/admin/*.py`, `app/services/client/*.py`, `app/services/auth_service.py` | `app/services/*.py` |
| **[5] CSDL** | `common/thesweets_common/models/*.py` + `app/database/session.py` | (dùng chung) + `app/database/session.py` |
| **[6] Báo realtime** | `app/services/realtime_service.py` | `app/services/realtime_service.py` |
| Xuất file Excel / PDF | `app/services/export/` (`excel_service.py`, `pdf_service.py`, font + logo trong `assets/`); router trả file qua `app/api/files.py`; giao diện lưu file bằng `src/utils/download.js` | — |
| Đổi lỗi thành HTTP | `app/core/exceptions.py` → `app/api/errors.py` | (giống web) |

### 3.3. Nhìn code thật của một request

Ví dụ: admin khóa tài khoản trên web (`PATCH /api/admin/users/{phone}/status`).

**[2] Gọi API** — `web/frontend/src/api/admin/index.js`

```js
toggleStatus: (phone, data) => axiosClient.patch(`/admin/users/${phone}/status`, data),
```

**[3] Router** — `web/backend/app/api/admin/users.py`: chỉ nhận request, gọi service, đổi model → JSON

```python
@router.patch("/{phone}/status", ...)
def toggle_user_status(phone: str, data: Optional[UserStatusUpdateIn] = None,
                       db: Session = Depends(get_db),
                       admin: User = Depends(get_current_admin)):   # ← deps.py kiểm tra quyền admin
    user, msg = AdminUserService.toggle_status(db, admin, phone, data.reason if data else None)
    return ResponseBase(message=msg, data=to_item_out(user))
```

**[4] Service** — `web/backend/app/services/admin/user_service.py`: toàn bộ logic + truy vấn CSDL

```python
def toggle_status(db, admin, phone, reason=None):
    if phone == admin.phone:
        raise BadRequestError("Bạn không thể tự khóa tài khoản của chính mình")  # ← thành HTTP 400
    user = AdminUserService._get_or_404(db, phone, "Không tìm thấy người dùng")  # ← thành HTTP 404
    ...
    db.commit()
    AdminUserService._kick_if_locked(user, was_active)   # ← [6] báo realtime "account_locked"
```

**[5] Model** — `common/thesweets_common/models/user.py`: class `User` ánh xạ bảng `users`.

---

## 4. Luồng Realtime đi qua những file nào

```text
 Service (sau db.commit)
   └─ RealtimeService.to_user / to_staff / broadcast / kick_user / stock_changed
        app/services/realtime_service.py  (web_backend hoặc mobile_backend)
        │  POST http://realtime:8001/internal/events   header X-Internal-Key: <INTERNAL_API_KEY>
        ▼
 realtime/app/api/internal.py            ← kiểm tra khóa nội bộ (sai → 403)
        ▼
 realtime/app/services/connection_manager.py  publish()
        │  chọn kết nối theo: target="user" (theo SĐT) | "staff" (admin/staff) | "all" (mọi người)
        ▼  gửi JSON {"event": "<tên>", ...dữ liệu}
 ┌──────────────────────────────────────────┬──────────────────────────────────────────────┐
 │ WEB: src/realtime/realtimeClient.js       │ APP: lib/core/network/websocket_service.dart │
 │      src/realtime/useRealtime.js          │      lib/core/realtime/realtime_provider.dart│
 │      useRealtimeEvent("tên", handler)     │      _dispatch(): switch (data['event'])     │
 │      trong các page/layout                │      → gọi provider tương ứng                │
 └──────────────────────────────────────────┴──────────────────────────────────────────────┘
```

**Kết nối được mở lúc nào?**

- **Web**: `ClientLayout.jsx` và `AdminLayout.jsx` gọi `useRealtimeConnection(token)`, mở `ws://localhost:8001/ws?token=...`.
- **App**: `realtime_provider.dart` kết nối khi mở app, rồi kết nối lại mỗi khi đăng nhập hoặc đăng xuất.
- **Server nhận kết nối**: `realtime/app/api/websocket.py` gọi `IdentityService.resolve(token)` (trong `realtime/app/services/identity_service.py`). Hàm này giải mã JWT, đọc bảng `users` để biết **số điện thoại** và **có phải staff không**.
- **Không có token** thì vẫn kết nối được, nhưng chỉ nhận sự kiện công khai (tồn kho, sản phẩm).

---

## 5. Ví dụ đi từng bước

### Ví dụ A — Khách đặt hàng trên APP, admin thấy ngay trên WEB

| # | Tầng | File | Hàm / việc làm |
| :- | :--- | :--- | :--- |
| 1 | App | `lib/features/cart/screens/checkout_modal.dart` | Khách bấm "Đặt hàng" → `ordersProvider.notifier.placeOrder(...)` |
| 2 | App | `lib/features/orders/providers/orders_provider.dart` | `ApiClient().dio.post('/orders', ...)` (thành `POST /api/v1/orders` + token) |
| 3 | Gateway | `gateway/nginx.conf` | Chỉ khi đi qua ngrok: chuyển tới `mobile_backend:8000` |
| 4 | Router | `mobile/backend/app/api/v1/endpoints/orders.py` | `create_order` — `Depends(get_current_customer)` kiểm tra token; body kiểm tra bằng `OrderCreate` (`app/schemas/order.py`) |
| 5 | Service | `mobile/backend/app/services/order_service.py` | `OrderService.create_order`: khóa dòng tồn kho (`ProductService.get_sellable_size(lock=True)`), kiểm tra voucher (`PromotionService`), tính tiền, trừ kho |
| 6 | CSDL | `common/thesweets_common/models/order.py`, `promotion.py`, `notification.py` | INSERT `orders`, `order_detail`, `order_status_logs`, `order_promotions`, `notifications`; DELETE `cart`; `db.commit()` |
| 7 | Response | router | Trả `OrderOut` → app hiện "Đặt hàng thành công" |
| 8 | Realtime | `order_service.py` (sau commit) | `to_user(phone, "new_notification")`, `to_user(phone, "cart_updated")`, `to_staff("new_order")`, `stock_changed(...)` |
| 9 | Nhận (web admin) | `web/frontend/src/admin/layouts/AdminLayout.jsx` | `useRealtimeEvent("new_order")` → hiện popup + âm thanh |
| 10 | Nhận (web admin) | `src/admin/pages/OrderList.jsx`, `Dashboard.jsx` | `useRealtimeEvent(["new_order", ...])` → tải lại danh sách |
| 11 | Nhận (mọi người) | Web `ProductDetail.jsx`, `ClientLayout.jsx`; App `realtime_provider.dart` | `stock_updated` → cập nhật tồn kho đang hiển thị |

**Nếu có lỗi:** hết hàng ở bước 5 → service `raise BadRequestError("Số lượng trong kho không đủ...")` → `app/api/errors.py` trả `400 {"detail": "..."}` → app hiện thông báo lỗi. Bước 6–11 không xảy ra.

### Ví dụ B — Admin đổi trạng thái đơn trên WEB, khách nhận thông báo trên APP

| # | Tầng | File | Hàm / việc làm |
| :- | :--- | :--- | :--- |
| 1 | Web | `web/frontend/src/admin/pages/OrderList.jsx` | Admin chọn "Ready" → `adminOrdersApi.updateStatus(id, status, note)` |
| 2 | Web | `src/api/admin/index.js` → `axiosClient.js` | `PATCH /api/admin/orders/{id}/status` + token admin |
| 3 | Router | `web/backend/app/api/admin/orders.py` | `update_order_status` — `Depends(get_current_staff)` (admin **và** staff đều được) |
| 4 | Service | `web/backend/app/services/admin/order_service.py` | `AdminOrderService.update_status`: kiểm tra chuyển trạng thái hợp lệ, hủy thì hoàn kho, ghi log + thông báo |
| 5 | CSDL | models `Order`, `OrderStatusLog`, `Notification`, `ProductSize` | UPDATE `orders`, INSERT `order_status_logs`, `notifications` |
| 6 | Realtime | cùng service | `to_user(khách, "order_status_updated")`, `to_staff("order_updated")`, (hủy đơn) `stock_changed` |
| 7 | Nhận (app) | `lib/core/realtime/realtime_provider.dart` | `case 'order_status_updated'` → `notificationsProvider.onRealtimeNotification` → hiện thông báo, tải lại đơn |
| 8 | Nhận (web khách) | `src/client/layouts/ClientLayout.jsx`, `pages/Receipt.jsx` | Hiện popup, trang Hóa đơn tự tải lại |
| 9 | Nhận (admin khác) | `OrderList.jsx`, `Dashboard.jsx` | `order_updated` → tải lại |

### Ví dụ C — Thêm bánh vào giỏ trên WEB, điện thoại cùng tài khoản tự cập nhật

```text
ProductDetail.jsx  (bấm "Thêm vào giỏ")
 └▶ src/store/cartStore.js  addToCart → clientCartApi.addToCart → POST /api/client/cart/items
     └▶ web/backend/app/api/client/cart.py  add_to_cart   [Depends(get_current_customer)]
         ├▶ app/services/client/cart_service.py  ClientCartService.add_item
         │     kiểm tra sản phẩm còn bán, đủ tồn kho → INSERT/UPDATE bảng cart
         └▶ RealtimeService.to_user(phone, "cart_updated")
              └▶ realtime → các kết nối cùng SĐT
                   ├ App: realtime_provider.dart  case 'cart_updated' → cartProvider.fetchCart()
                   └ Tab web khác: ClientLayout.jsx  useRealtimeEvent("cart_updated") → tải lại giỏ
```

### Ví dụ D — Admin khóa tài khoản, người đó bị đăng xuất ngay

```text
UserList.jsx → adminUsersApi.toggleStatus → PATCH /api/admin/users/{phone}/status
 └▶ api/admin/users.py toggle_user_status [get_current_admin]
     └▶ services/admin/user_service.py AdminUserService.toggle_status → UPDATE users (status=locked)
         └▶ RealtimeService.kick_user(phone, "account_locked", {reason})
              └▶ realtime: gửi "account_locked" rồi ĐÓNG kết nối với mã 4403
                   ├ App: realtime_provider.dart → authProvider.forceLogout(reason)
                   └ Web: ClientLayout.jsx / AdminLayout.jsx useRealtimeEvent("account_locked") → đăng xuất
Mọi request sau đó: deps.get_current_user thấy status=locked → 403 "Tài khoản này đã bị khóa"
```

---

## 6. Bản đồ toàn bộ chức năng

Cách đọc bảng: **Giao diện** → **Hàm gọi API** → **Endpoint** → **Router (file › hàm)** → **Service › hàm** → **Bảng bị đụng** → **Sự kiện phát ra**.
Đường dẫn router/service của web tính từ `web/backend/app/`, của app tính từ `mobile/backend/app/`.

### 6.1. Website — trang khách hàng (`web/frontend/src/client/`)

| Chức năng | Giao diện | Gọi API (`src/api/client/index.js`) | Endpoint | Router › hàm | Service › hàm | Bảng | Sự kiện |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Đăng ký | `pages/Register.jsx` | `clientAuthApi.register` | `POST /api/client/auth/register` | `api/client/auth.py` › `register` | `services/auth_service.py` › `register_customer` | users, customers | — |
| Đăng nhập | `pages/Login.jsx` | `clientAuthApi.login` | `POST /api/client/auth/login` | `api/client/auth.py` › `login` | `auth_service.py` › `login_customer` | users | — |
| Xem hồ sơ | `pages/Login.jsx` | `clientAuthApi.getProfile` | `GET /api/client/auth/me` | `api/client/auth.py` › `get_me` | (deps `get_current_user`) | users | — |
| Sửa hồ sơ | — | `clientAuthApi.updateProfile` | `PUT /api/client/profile` | `api/client/profile.py` › `update_profile` | `services/client/profile_service.py` › `update_profile` | users, customers | — |
| Đổi mật khẩu | — | (API có sẵn) | `POST /api/client/profile/change-password` | `profile.py` › `change_password` | `profile_service.py` › `change_password` | users | — |
| Trang chủ, bán chạy | `pages/Home.jsx` | `clientProductsApi.getAll`, `getBestSellers` | `GET /api/client/products`, `/best-sellers` | `api/client/products.py` › `list_products`, `list_best_sellers` | `services/client/product_service.py` › `get_products`, `get_best_sellers` | product, product_sizes, order_detail | nhận `stock_updated`, `products_changed` |
| Danh sách / lọc bánh | `pages/Products.jsx` | `clientProductsApi.getAll`, `getCategories` | `GET /api/client/products`, `/categories` | `products.py` › `list_products`, `list_categories` | `product_service.py` › `get_products`, `get_categories` | product, category | nhận `stock_updated`, `products_changed` |
| Chi tiết bánh | `pages/ProductDetail.jsx` | `clientProductsApi.getById` | `GET /api/client/products/{id}` | `products.py` › `get_product` | `product_service.py` › `get_by_id` | product, product_sizes | nhận `stock_updated`, `products_changed` |
| Xem giỏ | `store/cartStore.js` | `clientCartApi.getCart` | `GET /api/client/cart` | `api/client/cart.py` › `get_cart` | `services/client/cart_service.py` › `get_cart_summary` | cart, product_sizes | nhận `cart_updated` |
| Thêm vào giỏ | `ProductDetail.jsx` → `cartStore.js` | `clientCartApi.addToCart` | `POST /api/client/cart/items` | `cart.py` › `add_to_cart` | `cart_service.py` › `add_item` | cart | phát `cart_updated` |
| Sửa số lượng | `components/CartDrawer.jsx` → `cartStore.js` | `clientCartApi.updateItem` | `PUT /api/client/cart/items/{id}` | `cart.py` › `update_cart_item` | `cart_service.py` › `update_quantity` | cart | phát `cart_updated` |
| Xóa món / dọn giỏ | `CartDrawer.jsx` → `cartStore.js` | `removeItem`, `clearCart` | `DELETE /api/client/cart/items/{id}`, `DELETE /api/client/cart` | `cart.py` › `remove_cart_item`, `clear_cart` | `cart_service.py` › `remove_item`, `clear_cart` | cart | phát `cart_updated` |
| Xem voucher | `pages/Vouchers.jsx` | `clientPromotionsApi.getAll` | `GET /api/client/promotions` | `api/client/promotions.py` › `list_promotions` | `services/client/promotion_service.py` › `get_promotions` | promotions, invoice_promotions | — |
| Áp voucher | `pages/Pay.jsx` | `clientPromotionsApi.apply` | `POST /api/client/promotions/apply` | `promotions.py` › `apply_promotion` | `promotion_service.py` › `calculate_discount` | promotions, order_promotions | — |
| **Đặt hàng** | `pages/Pay.jsx` | `clientOrdersApi.createOrder` | `POST /api/client/orders` | `api/client/orders.py` › `create_order` | `services/client/order_service.py` › `create_order` | orders, order_detail, order_promotions, order_status_logs, product_sizes, cart | phát `new_order`, `cart_updated`, `stock_updated` |
| **Tải hóa đơn PDF** | `pages/Receipt.jsx` (nút "Tải hóa đơn PDF") | `clientOrdersApi.downloadInvoice` (Blob) | `GET /api/client/orders/{id}/invoice` | `orders.py` › `download_my_invoice` (chỉ đơn của chính khách) | `order_service.py` › `get_order_by_id` → `services/export/pdf_service.py` › `order_invoice` | orders, order_detail | — |
| Lịch sử đơn | `pages/Receipt.jsx` | `clientOrdersApi.getMyOrders` | `GET /api/client/orders` | `orders.py` › `get_my_orders` | `order_service.py` › `get_my_orders` | orders, order_detail | nhận `order_status_updated`, `order_updated` |
| Hủy đơn | — (chưa có nút, API có sẵn) | `clientOrdersApi.cancelOrder` | `PUT /api/client/orders/{id}/cancel` | `orders.py` › `cancel_my_order` | `order_service.py` › `cancel_order` | orders, order_status_logs, product_sizes | phát `order_updated`, `stock_updated` |
| Thông báo | — | (API có sẵn) | `GET /api/client/notifications`, `PUT .../read-all` | `api/client/notifications.py` | `services/client/notification_service.py` › `get_recent`, `mark_all_read` | notifications, promotions | — |

### 6.2. Website — trang quản trị (`web/frontend/src/admin/`)

| Chức năng | Giao diện | Gọi API (`src/api/admin/index.js`) | Endpoint | Router › hàm | Service › hàm | Bảng | Sự kiện |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Đăng nhập quản trị | `pages/AdminLogin.jsx` | `adminAuthApi.login` | `POST /api/admin/auth/login` | `api/admin/auth.py` › `admin_login` | `services/auth_service.py` › `login_backoffice` | users | — |
| Dashboard | `pages/Dashboard.jsx` | `adminDashboardApi.getOverview` (+ orders, products) | `GET /api/admin/dashboard/overview` | `api/admin/dashboard.py` › `get_dashboard_overview` | `services/admin/stats_service.py` › `get_dashboard_overview` | orders, order_detail, product_sizes, import_receipts | nhận `new_order`, `order_updated`, `stock_updated`, `products_changed` |
| Báo cáo doanh thu | `pages/Statistical.jsx` | `adminStatisticalApi.getReport(period)` | `GET /api/admin/statistical/report?period=` | `api/admin/statistical.py` › `get_revenue_report` | `services/admin/report_service.py` › `revenue_report` | orders, order_detail, product, category | — |
| **Xuất báo cáo Excel** | `Statistical.jsx` (nút "Xuất Excel") | `adminStatisticalApi.exportReport(period)` (Blob) | `GET /api/admin/statistical/report/export?period=` | `statistical.py` › `export_revenue_report` | `report_service.py` › `export_excel` → `services/export/excel_service.py` › `revenue_report` | (như trên) | — |
| Danh sách bánh | `pages/ProductList.jsx` | `adminProductsApi.getAll` | `GET /api/admin/products` | `api/admin/products.py` › `list_products` | `services/admin/product_service.py` › `get_all` | product, product_sizes, category | nhận `stock_updated`, `products_changed` |
| Thêm / sửa bánh | `pages/ProductForm.jsx` | `adminProductsApi.create`, `update`, `getById` | `POST /api/admin/products`, `PUT /{id}` | `products.py` › `create_product`, `update_product` | `product_service.py` › `create`, `update` | product, product_sizes | phát `products_changed` |
| Ngừng / mở bán | `ProductList.jsx` | `adminProductsApi.update(id, {status})` | `PUT /api/admin/products/{id}` | `products.py` › `update_product` | `product_service.py` › `update` | product | phát `products_changed` |
| Xóa mềm (API có sẵn) | — | `adminProductsApi.delete` | `DELETE /api/admin/products/{id}` | `products.py` › `delete_product` | `product_service.py` › `delete` | product, cart | phát `products_changed` |
| Upload ảnh bánh | `ProductForm.jsx` | `adminProductsApi.uploadImage` | `POST /api/admin/products/upload-image` | `products.py` › `upload_product_image` | `services/admin/upload_service.py` › `save_product_image` | (file trong `web/backend/uploads/`) | — |
| Danh sách đơn | `pages/OrderList.jsx` | `adminOrdersApi.getAll` | `GET /api/admin/orders` | `api/admin/orders.py` › `list_orders` | `services/admin/order_service.py` › `get_all` | orders, order_detail | nhận `new_order`, `order_updated` |
| **Đổi trạng thái đơn** | `OrderList.jsx` | `adminOrdersApi.updateStatus` | `PATCH /api/admin/orders/{id}/status` | `orders.py` › `update_order_status` | `order_service.py` › `update_status` | orders, order_status_logs, notifications, product_sizes | phát `order_status_updated`, `order_updated`, `stock_updated` |
| **Xuất hóa đơn PDF** | `OrderList.jsx` (modal, nút "Xuất Hóa Đơn PDF") | `adminOrdersApi.exportInvoice` (Blob) | `GET /api/admin/orders/{id}/invoice` | `orders.py` › `export_order_invoice` | `order_service.py` › `get_by_id` → `services/export/pdf_service.py` › `order_invoice` | orders, order_detail, promotions | — |
| Xác nhận thanh toán | `OrderList.jsx` | `adminOrdersApi.confirmPayment` | `PATCH /api/admin/orders/{id}/payment` | `orders.py` › `confirm_order_payment` | `order_service.py` › `confirm_payment` | orders, order_status_logs | phát `order_updated` |
| Phiếu nhập kho | `pages/ImportReceiptList.jsx` | `adminImportReceiptsApi.getAll`, `getSuppliers`, `create`, `updateStatus` | `/api/admin/import-receipts...` | `api/admin/import_receipts.py` | `services/admin/import_receipt_service.py` | suppliers, import_receipts, import_receipt_details, product_sizes | phát `stock_updated` |
| **Xuất phiếu nhập PDF** | `ImportReceiptList.jsx` (modal, nút "Xuất Phiếu PDF") | `adminImportReceiptsApi.exportPdf` (Blob) | `GET /api/admin/import-receipts/{id}/pdf` | `import_receipts.py` › `export_receipt_pdf` | `import_receipt_service.py` › `get_by_id` → `pdf_service.py` › `import_receipt` | import_receipts, import_receipt_details, suppliers | — |
| Voucher | `pages/PromotionList.jsx` | `adminPromotionsApi.getAll`, `create`, `update`, `updateStatus` | `/api/admin/promotions...` | `api/admin/promotions.py` | `services/admin/promotion_service.py` | promotions, invoice_promotions | — |
| Tài khoản | `pages/UserList.jsx` | `adminUsersApi.getAll`, `create`, `update` | `GET/POST /api/admin/users`, `PATCH /{phone}` | `api/admin/users.py` | `services/admin/user_service.py` › `list_users`, `create_user`, `update_user` | users, customers | phát `account_locked` (nếu khóa) |
| **Khóa / mở khóa** | `UserList.jsx` | `adminUsersApi.toggleStatus` | `PATCH /api/admin/users/{phone}/status` | `users.py` › `toggle_user_status` | `user_service.py` › `toggle_status` | users | phát `account_locked` |

### 6.3. App Flutter (`mobile/frontend/lib/features/`)

| Chức năng | Màn hình | Provider › hàm (gọi API) | Endpoint | Router › hàm | Service › hàm | Bảng | Sự kiện |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Đăng nhập / đăng ký | `auth/screens/login_modal.dart` | `auth/providers/auth_provider.dart` › `login`, `register` | `POST /api/v1/auth/login`, `/register` | `api/v1/endpoints/auth.py` › `login`, `register` | `services/auth_service.py` › `authenticate`, `register`, `issue_token` | users, customers | — |
| Hồ sơ | `profile/screens/profile_screen.dart`, `edit_profile_modal.dart` | `auth_provider.dart` › `updateProfile` | `GET /api/v1/auth/me`, `PUT /api/v1/auth/profile` | `auth.py` › `get_profile`, `update_profile` | `auth_service.py` › `build_profile`, `update_profile` | users, customers | — |
| Sản phẩm, danh mục | `home/screens/home_screen.dart`, `products/screens/product_detail_screen.dart` | `products/providers/product_provider.dart` | `GET /api/v1/products`, `/products/{id}`, `/categories` | `api/v1/endpoints/products.py` | `services/product_service.py` › `get_products`, `get_product_detail`, `get_categories` | product, product_sizes, category, size | nhận `stock_updated`, `products_changed` |
| Giỏ hàng | `cart/screens/cart_screen.dart`, `product_detail_screen.dart` | `cart/providers/cart_provider.dart` › `fetchCart`, `addToCart`, `incrementQty`, `removeItem`, `clearCart` | `GET/POST/DELETE /api/v1/cart`, `PUT/DELETE /cart/{id}` | `api/v1/endpoints/cart.py` | `services/cart_service.py` › `get_cart`, `add_item`, `update_item`, `remove_item`, `clear` | cart | phát + nhận `cart_updated` |
| Voucher | `promotions/screens/promotions_screen.dart`, `voucher_selector_modal.dart` | `promotions/providers/promotions_provider.dart` | `GET /api/v1/promotions` | `api/v1/endpoints/promotions.py` › `get_promotions` | `services/promotion_service.py` › `get_active_promotions` | promotions, invoice_promotions | — |
| **Đặt hàng** | `cart/screens/checkout_modal.dart` | `orders/providers/orders_provider.dart` › `placeOrder` | `POST /api/v1/orders` | `api/v1/endpoints/orders.py` › `create_order` | `services/order_service.py` › `create_order` | orders, order_detail, order_promotions, order_status_logs, notifications, product_sizes, cart | phát `new_notification`, `cart_updated`, `new_order`, `stock_updated` |
| Đơn của tôi | `orders/screens/orders_screen.dart` | `orders_provider.dart` › `fetchOrders` | `GET /api/v1/orders` | `orders.py` › `get_my_orders` | `order_service.py` › `get_orders` | orders, order_detail | nhận `order_status_updated`, `order_updated` |
| Thông báo | `home/screens/home_screen.dart` | `notifications/providers/notifications_provider.dart` › `markAsRead`, `markAllAsRead` | `GET /api/v1/notifications`, `PUT /notifications/{id}/read`, `/read-all` | `api/v1/endpoints/notifications.py` | `services/notification_service.py` | notifications | nhận `new_notification`, `order_status_updated` |
| Bị khóa tài khoản | `navigation/screens/main_navigation_screen.dart` | `auth_provider.dart` › `forceLogout` | (qua WebSocket) | — | — | — | nhận `account_locked` |

---

## 7. Danh sách sự kiện realtime

| Sự kiện | Gửi tới | Ai phát (file › hàm) | Ai nhận và làm gì |
| :--- | :--- | :--- | :--- |
| `new_order` | staff | web `services/client/order_service.py` › `create_order`; mobile `services/order_service.py` › `create_order` | Web admin: `AdminLayout.jsx` (popup), `OrderList.jsx`, `Dashboard.jsx` (tải lại) |
| `order_updated` | staff (+ khách khi xác nhận thanh toán) | web `services/admin/order_service.py` › `update_status`, `confirm_payment`; web `client/order_service.py` › `cancel_order`; mobile `order_service.py` › `update_status` | Web admin: `OrderList.jsx`, `Dashboard.jsx`; web khách: `Receipt.jsx`; app: `ordersProvider.fetchOrders` |
| `order_status_updated` | khách của đơn | web `admin/order_service.py` › `update_status`; mobile `order_service.py` › `update_status` | Web khách: `ClientLayout.jsx` (popup), `Receipt.jsx`; app: `notificationsProvider.onRealtimeNotification` |
| `new_notification` | khách vừa đặt đơn | mobile `order_service.py` › `create_order` | App: `notificationsProvider.onRealtimeNotification` |
| `cart_updated` | chính chủ giỏ hàng | web `api/client/cart.py`, `client/order_service.py`; mobile `endpoints/cart.py`, `order_service.py` | Web: `ClientLayout.jsx`; app: `cartProvider.fetchCart` |
| `stock_updated` | tất cả | `RealtimeService.stock_changed` (đặt / hủy đơn, nhập kho) | Web: `ProductDetail.jsx`, `Products.jsx`, `Home.jsx`, `ClientLayout.jsx`, `ProductList.jsx`, `Dashboard.jsx`; app: `productsProvider`, `cartProvider.applyStock` |
| `products_changed` | tất cả | web `api/admin/products.py` (thêm / sửa / ngừng bán) | Web: `Home.jsx`, `Products.jsx`, `ProductDetail.jsx`, `ProductList.jsx`, `Dashboard.jsx`; app: `productsProvider` |
| `account_locked` | người bị khóa (rồi ngắt kết nối mã 4403) | web `services/admin/user_service.py` › `_kick_if_locked` | Web: `ClientLayout.jsx`, `AdminLayout.jsx`; app: `authProvider.forceLogout` |
| `connected` | người vừa kết nối | `realtime/app/api/websocket.py` | Cho client biết đã xác thực / có phải staff |

---

## 8. Phân quyền và xử lý lỗi

### 8.1. Ai được gọi API nào (`app/api/deps.py`)

| Dependency | Ở backend | Cho phép | Dùng ở |
| :--- | :--- | :--- | :--- |
| *(không có)* | cả hai | Ai cũng gọi được | Đăng nhập, đăng ký, xem sản phẩm |
| `get_optional_current_user` | cả hai | Có hoặc không token đều được | Danh sách voucher |
| `get_current_user` | cả hai | Mọi tài khoản đã đăng nhập, không bị khóa | Hồ sơ, thông báo |
| `get_current_customer` | cả hai | Tài khoản có hồ sơ khách hàng | Giỏ hàng, đặt đơn |
| `get_current_staff` | web | admin **hoặc** staff | Quản lý đơn hàng |
| `get_current_admin` | web | chỉ admin | Sản phẩm, nhập kho, voucher, tài khoản, thống kê |
| `require_staff` | mobile | admin hoặc staff | Đổi trạng thái đơn, upload ảnh |

Token JWT được ký bằng `SECRET_KEY` (giống nhau ở cả 3 server, đọc từ `.env`), nên token đăng nhập trên web vẫn dùng được với app và realtime.

### 8.2. Lỗi đi như thế nào

```text
Service:  raise NotFoundError("Không tìm thấy đơn hàng này")      ← app/core/exceptions.py (không biết gì về HTTP)
   ▼
app/api/errors.py:  NotFoundError → 404, BadRequestError → 400, ForbiddenError → 403, UnauthorizedError → 401
   ▼
Client nhận:  404  {"detail": "Không tìm thấy đơn hàng này"}
   ▼
Web: axiosClient.js (401 → tự đăng xuất) → page hiện error.response.data.detail
App: api_exception.dart → màn hình hiện thông báo
```

Ngoài ra, nếu body sai kiểu dữ liệu (thiếu trường, sai định dạng), **schema Pydantic** trả `422` trước khi vào router.

---

## 9. Công thức dò một chức năng bất kỳ

Ví dụ bạn muốn hiểu chức năng **"Hủy đơn hàng"**:

**Bước 1 — Từ giao diện tìm hàm gọi API**

- Web: tìm tên chức năng trong `web/frontend/src/**/pages/*.jsx`, thấy nó gọi `clientOrdersApi.cancelOrder`.
- App: tìm trong `mobile/frontend/lib/features/*/screens/`, thấy nó gọi `xxxProvider.notifier).hamNao(`.

**Bước 2 — Từ hàm gọi API tìm endpoint**

- Mở `src/api/client/index.js` (hoặc file provider), thấy `PUT /client/orders/{id}/cancel`.
- Endpoint đầy đủ = `VITE_API_URL` (`/api`) + đường dẫn = `PUT /api/client/orders/{id}/cancel`.

**Bước 3 — Từ endpoint tìm router**

| Đường dẫn bắt đầu bằng | Thư mục router |
| :--- | :--- |
| `/api/admin/<nhóm>` | `web/backend/app/api/admin/<nhóm>.py` (nhóm `import-receipts` → `import_receipts.py`) |
| `/api/client/<nhóm>` | `web/backend/app/api/client/<nhóm>.py` |
| `/api/v1/<nhóm>` | `mobile/backend/app/api/v1/endpoints/<nhóm>.py` |

Trong file, tìm decorator khớp với phần còn lại: `@router.put("/{order_id}/cancel")` → hàm `cancel_my_order`.

**Bước 4 — Từ router tìm service**

- Router gọi `ClientOrderService.cancel_order(...)`, nên mở `app/services/client/order_service.py`, hàm `cancel_order`.
- Đây là nơi chứa **toàn bộ logic**: điều kiện được hủy, hoàn kho, ghi log.

**Bước 5 — Xem bảng và sự kiện**

- Các dòng `from thesweets_common.models... import Order, ...` cho biết service đụng bảng nào. Mở `common/thesweets_common/models/<file>.py` để xem cột.
- Tìm `RealtimeService.` trong hàm đó để biết phát sự kiện gì (ở đây là `order_updated`, `stock_updated`).
- Tìm tên sự kiện trong frontend để biết ai nhận:

```bash
# Ai phát sự kiện X?
grep -rn '"stock_updated"' web/backend/app mobile/backend/app
# Ai nhận sự kiện X?
grep -rn "stock_updated" web/frontend/src mobile/frontend/lib
```

**Bước 6 — Thử nhanh bằng Swagger**

Mở `http://localhost:5000/docs` (web) hoặc `http://localhost:8000/docs` (app), tìm endpoint và bấm **Try it out**. Muốn gọi API cần đăng nhập thì bấm **Authorize** và dán token.

---

## 10. Thêm chức năng mới thì sửa những file nào

Làm theo đúng thứ tự **từ dưới lên** (dữ liệu → nghiệp vụ → API → giao diện):

| # | Việc | File (ví dụ cho web backend) |
| :- | :--- | :--- |
| 1 | Thêm bảng / cột (nếu cần) | `database/createTable.sql` + file mới trong `database/migrations/` |
| 2 | Khai báo model | `common/thesweets_common/models/<tên>.py` + export trong `models/__init__.py` |
| 3 | Schema request/response | `web/backend/app/schemas/<admin\|client>/<tên>.py` |
| 4 | Logic nghiệp vụ | `web/backend/app/services/<admin\|client>/<tên>_service.py` — lỗi thì `raise BadRequestError/NotFoundError` |
| 5 | Báo realtime (nếu người khác cần biết) | gọi `RealtimeService.to_user / to_staff / broadcast` trong service, sau `db.commit()` |
| 6 | Endpoint | `web/backend/app/api/<admin\|client>/<tên>.py` — chỉ gọi service, gắn `Depends(get_current_...)` |
| 7 | Đăng ký router (nếu là file mới) | `web/backend/app/api/<admin\|client>/api.py` |
| 8 | Hàm gọi API | `web/frontend/src/api/<admin\|client>/index.js` |
| 9 | Giao diện | `web/frontend/src/<admin\|client>/pages/<Tên>.jsx` (+ route trong `src/App.jsx`) |
| 10 | Nhận realtime | `useRealtimeEvent("tên_sự_kiện", ...)` trong page; với app thêm `case` trong `lib/core/realtime/realtime_provider.dart` |

**Những điều KHÔNG làm** (để giữ đúng kiến trúc):

- Không viết `db.query(...)`, `db.add(...)`, `db.commit()` trong router. Việc này thuộc về service.
- Không `import fastapi` / `HTTPException` trong service. Hãy dùng lỗi trong `app/core/exceptions.py`.
- Không khai báo model riêng trong từng backend. Thêm vào `common/thesweets_common/models/` để cả hai backend dùng chung.
- Không để backend này gọi API của backend kia. Muốn báo cho nhau thì đi qua CSDL hoặc realtime.
- Không gọi `axios` / `dio` thẳng trong page/screen. Đi qua `src/api/` (web) hoặc provider (app).

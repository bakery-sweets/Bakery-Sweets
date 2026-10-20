# TÀI LIỆU CHI TIẾT API CLIENT - THE SWEETS BAKERY

> **Dự án:** The Sweets Bakery Management & E-Commerce System  
> **Cụm Module:** Backend API Client (`web/backend/app/api/client`)  
> **Kiến trúc:** Python FastAPI + SQLAlchemy + MySQL / MariaDB (Đồng bộ với React Frontend & Mobile App)  
> **Phiên bản tài liệu:** 1.0.0 (Ngày cập nhật: 21/10/2026)  

---

## MỤC LỤC
1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Cấu trúc thư mục mã nguồn](#2-cấu-trúc-thư-mục-mã-nguồn)
3. [Danh sách chi tiết các Endpoint API](#3-danh-sách-chi-tiết-các-endpoint-api)
   - [3.1. Xác thực & Tài khoản (Auth)](#31-xác-thực--tài-khoản-auth)
   - [3.2. Hồ sơ cá nhân (Profile)](#32-hồ-sơ-cá-nhân-profile)
   - [3.3. Sản phẩm & Danh mục (Products)](#33-sản-phẩm--danh-mục-products)
   - [3.4. Giỏ hàng (Cart)](#34-giỏ-hàng-cart)
   - [3.5. Chương trình khuyến mãi & Voucher (Promotions)](#35-chương-trình-khuyến-mãi--voucher-promotions)
   - [3.6. Đơn hàng & Đặt bánh (Orders)](#36-đơn-hàng--đặt-bánh-orders)
4. [Các quy tắc nghiệp vụ cốt lõi (Business Logic)](#4-các-quy-tắc-nghiệp-vụ-cốt-lõi-business-logic)
5. [Đồng bộ với Frontend Web](#5-đồng-bộ-với-frontend-web)
6. [Báo cáo kết quả kiểm thử tự động (Pytest)](#6-báo-cáo-kết-quả-kiểm-thử-tự-động-pytest)

---

## 1. TỔNG QUAN KIẾN TRÚC

Cụm API Client được thiết kế chuyên biệt phục vụ cổng bán hàng trực tuyến (Storefront) cho khách hàng của Tiệm Bánh The Sweets. Toàn bộ các API đều tuân thủ chuẩn RESTful, trả về dữ liệu định dạng JSON nhất quán, áp dụng xác thực stateless bằng **JWT (JSON Web Token)** và mã hóa mật khẩu an toàn bằng **Bcrypt**.

* **Base URL:** `http://localhost:5000/api/client`
* **Cơ chế xác thực:** `Authorization: Bearer <access_token>`
* **Định dạng phản hồi chung (`ResponseBase`):**
  ```json
  {
    "message": "Thông báo trạng thái thực thi",
    "data": { ... }
  }
  ```

---

## 2. CẤU TRÚC THƯ MỤC MÃ NGUỒN

```
web/backend/
├── app/
│   ├── api/
│   │   ├── deps.py                         # Dependencies: get_db, get_current_user, get_current_customer, get_optional_current_user
│   │   └── client/
│   │       ├── __init__.py                 # Export client_router
│   │       ├── api.py                      # Tổng hợp router client
│   │       ├── auth.py                     # Đăng ký, đăng nhập, thông tin phiên
│   │       ├── profile.py                  # Cập nhật họ tên, email, đổi mật khẩu
│   │       ├── products.py                 # Lấy danh mục, danh sách bánh, chi tiết bánh
│   │       ├── cart.py                     # Thao tác giỏ hàng (thêm, sửa, xóa)
│   │       ├── promotions.py               # Xem voucher, tính thử giảm giá (Mới)
│   │       └── orders.py                   # Đặt hàng, lịch sử, chi tiết, hủy đơn
│   ├── models/
│   │   ├── user.py                         # User, Customer
│   │   ├── product.py                      # Category, Size, Product, ProductSize
│   │   ├── promotion.py                    # Promotion, InvoicePromotion, OrderPromotion (Mới)
│   │   └── order.py                        # Cart, Order, OrderDetail, OrderStatusLog
│   ├── schemas/client/
│   │   ├── auth.py                         # Schemas Auth & Token
│   │   ├── product.py                      # Schemas Product & Category
│   │   ├── cart.py                         # Schemas Cart
│   │   ├── promotion.py                    # Schemas Promotion & Voucher (Mới)
│   │   └── order.py                        # Schemas Order & Checkout
│   └── services/client/
│       ├── product_service.py              # Xử lý truy vấn sản phẩm & danh mục
│       ├── cart_service.py                 # Xử lý giỏ hàng & kiểm tra tồn kho
│       ├── promotion_service.py            # Tính toán voucher & giới hạn lượt dùng (Mới)
│       └── order_service.py                # Xử lý checkout, trừ tồn kho & hủy đơn
└── tests/                                  # Bộ kiểm thử tự động (36/36 tests passed)
    ├── conftest.py
    ├── test_client_auth.py
    ├── test_client_profile.py
    ├── test_client_products.py
    ├── test_client_cart.py
    ├── test_client_promotions.py
    └── test_client_orders.py
```

---

## 3. DANH SÁCH CHI TIẾT CÁC ENDPOINT API

### 3.1. Xác thực & Tài khoản (Auth)

#### 1. Đăng ký tài khoản khách hàng
* **Endpoint:** `POST /api/client/auth/register`
* **Mô tả:** Đăng ký tài khoản khách hàng mới. Kiểm tra trùng SĐT và Email.
* **Request Body:**
  ```json
  {
    "phone": "0912345678",
    "email": "customer@gmail.com",
    "password": "Password123",
    "first_name": "Văn An",
    "last_name": "Nguyễn"
  }
  ```
* **Phản hồi thành công (`201 Created`):**
  ```json
  {
    "message": "Đăng ký tài khoản thành công",
    "data": {
      "phone": "0912345678",
      "email": "customer@gmail.com",
      "first_name": "Văn An",
      "last_name": "Nguyễn",
      "role": "customer"
    }
  }
  ```

#### 2. Đăng nhập tài khoản khách hàng
* **Endpoint:** `POST /api/client/auth/login`
* **Mô tả:** Xác thực SĐT và mật khẩu, kiểm tra tài khoản không bị khóa (`locked`), trả về token và thông tin người dùng.
* **Request Body:**
  ```json
  {
    "phone": "0912345678",
    "password": "Password123"
  }
  ```
* **Phản hồi thành công (`200 OK`):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "phone": "0912345678",
    "email": "customer@gmail.com",
    "role": "customer",
    "first_name": "Văn An",
    "last_name": "Nguyễn"
  }
  ```

#### 3. Xem thông tin cá nhân hiện tại
* **Endpoint:** `GET /api/client/auth/me`
* **Header:** `Authorization: Bearer <token>`
* **Phản hồi thành công (`200 OK`):**
  ```json
  {
    "message": "Thành công",
    "data": {
      "phone": "0912345678",
      "email": "customer@gmail.com",
      "first_name": "Văn An",
      "last_name": "Nguyễn",
      "role": "customer"
    }
  }
  ```

---

### 3.2. Hồ sơ cá nhân (Profile)

#### 1. Cập nhật thông tin cá nhân
* **Endpoint:** `PUT /api/client/profile`
* **Header:** `Authorization: Bearer <token>`
* **Mô tả:** Cập nhật họ tên hoặc email (tự động kiểm tra trùng lặp email với các tài khoản khác).
* **Request Body:**
  ```json
  {
    "first_name": "Bảo An",
    "last_name": "Nguyễn",
    "email": "new_email@gmail.com"
  }
  ```
* **Phản hồi thành công (`200 OK`):**
  ```json
  {
    "message": "Cập nhật thông tin thành công",
    "data": {
      "phone": "0912345678",
      "email": "new_email@gmail.com",
      "first_name": "Bảo An",
      "last_name": "Nguyễn",
      "role": "customer"
    }
  }
  ```

#### 2. Đổi mật khẩu
* **Endpoint:** `POST /api/client/profile/change-password`
* **Header:** `Authorization: Bearer <token>`
* **Mô tả:** Xác thực mật khẩu cũ, yêu cầu mật khẩu mới khác mật khẩu cũ và tối thiểu 6 ký tự.
* **Request Body:**
  ```json
  {
    "old_password": "Password123",
    "new_password": "NewSecurePassword456"
  }
  ```
* **Phản hồi thành công (`200 OK`):**
  ```json
  {
    "message": "Đổi mật khẩu thành công",
    "data": null
  }
  ```

---

### 3.3. Sản phẩm & Danh mục (Products)

#### 1. Lấy danh sách danh mục bánh
* **Endpoint:** `GET /api/client/products/categories`
* **Phản hồi thành công (`200 OK`):**
  ```json
  {
    "message": "Thành công",
    "data": [
      {
        "category_id": 1,
        "category_name": "Mousse Cake",
        "description": "Bánh mousse mềm mịn thanh mát, ít ngọt chuẩn vị Pháp"
      },
      {
        "category_id": 2,
        "category_name": "Croissant & Pastry",
        "description": "Bánh sừng bò ngàn lớp thơm bơ Pháp thượng hạng"
      }
    ]
  }
  ```

#### 2. Xem danh sách bánh khả dụng
* **Endpoint:** `GET /api/client/products`
* **Query Parameters:**
  * `category` *(optional)*: Tên danh mục (ví dụ `Mousse`) hoặc ID danh mục (ví dụ `1`) hoặc `ALL`.
  * `search` *(optional)*: Từ khóa tìm kiếm theo tên bánh.
* **Phản hồi thành công (`200 OK`):**
  ```json
  {
    "message": "Thành công",
    "data": [
      {
        "product_id": 1,
        "product_name": "Tiramisu Mousse",
        "category_id": 1,
        "category_name": "Mousse Cake",
        "status": "Available",
        "ingredients": "Phô mai Mascarpone Ý, cà phê Espresso...",
        "expiration_date": "2 ngày",
        "storage_instructions": "Bảo quản ngăn mát 2-6°C",
        "image": "/uploads/Mousse/Tiramisu_Mousse.jpg",
        "min_price": 130000.0,
        "sizes": [
          {
            "id": 1,
            "size_id": 1,
            "size_name": "Size S (16cm)",
            "price": 130000.0,
            "stock_quantity": 15
          },
          {
            "id": 2,
            "size_id": 2,
            "size_name": "Size M (20cm)",
            "price": 190000.0,
            "stock_quantity": 10
          }
        ]
      }
    ]
  }
  ```

#### 3. Xem chi tiết một món bánh
* **Endpoint:** `GET /api/client/products/{product_id}`
* **Phản hồi thành công (`200 OK`):** Trả về đầy đủ thông tin chi tiết và mảng `sizes` đã sắp xếp theo thứ tự giá từ thấp đến cao.

---

### 3.4. Giỏ hàng (Cart)

#### 1. Lấy danh sách món trong giỏ hàng
* **Endpoint:** `GET /api/client/cart`
* **Header:** `Authorization: Bearer <token>`
* **Phản hồi thành công (`200 OK`):**
  ```json
  {
    "message": "Thành công",
    "data": {
      "items": [
        {
          "cart_id": 10,
          "product_id": 1,
          "product_name": "Tiramisu Mousse",
          "image": "/uploads/Mousse/Tiramisu_Mousse.jpg",
          "size_id": 1,
          "size_name": "Size S (16cm)",
          "unit_price": 130000.0,
          "quantity": 2,
          "item_total": 260000.0
        }
      ],
      "total_items": 2,
      "total_amount": 260000.0
    }
  }
  ```

#### 2. Thêm món bánh vào giỏ
* **Endpoint:** `POST /api/client/cart/items`
* **Header:** `Authorization: Bearer <token>`
* **Mô tả:** Thêm món bánh theo kích cỡ chỉ định. Kiểm tra sản phẩm và kích cỡ có tồn tại, còn mở bán (`Available`) và không vượt quá số lượng tồn kho khả dụng.
* **Request Body:**
  ```json
  {
    "product_id": 1,
    "size_id": 1,
    "quantity": 2
  }
  ```
* **Phản hồi thành công (`201 Created`):**
  ```json
  {
    "message": "Đã thêm vào giỏ hàng",
    "data": null
  }
  ```

#### 3. Cập nhật số lượng món trong giỏ
* **Endpoint:** `PUT /api/client/cart/items/{cart_id}`
* **Header:** `Authorization: Bearer <token>`
* **Mô tả:** Thay đổi số lượng của món bánh trong giỏ. Nếu truyền `quantity = 0`, hệ thống tự động xóa món này khỏi giỏ. Trả về 404 nếu `cart_id` không tồn tại trong giỏ của người dùng.
* **Request Body:**
  ```json
  {
    "quantity": 3
  }
  ```

#### 4. Xóa một món khỏi giỏ hàng
* **Endpoint:** `DELETE /api/client/cart/items/{cart_id}`
* **Header:** `Authorization: Bearer <token>`

#### 5. Xóa sạch toàn bộ giỏ hàng
* **Endpoint:** `DELETE /api/client/cart`
* **Header:** `Authorization: Bearer <token>`

---

### 3.5. Chương trình khuyến mãi & Voucher (Promotions)

#### 1. Lấy danh sách Voucher khả dụng
* **Endpoint:** `GET /api/client/promotions`
* **Header:** `Authorization: Bearer <token>` *(Optional)*
* **Mô tả:** Trả về danh sách voucher đang kích hoạt (`Active`), còn hạn sử dụng. Nếu người dùng đã đăng nhập, hệ thống tự động kiểm tra số lần tài khoản đã dùng mã này và đánh dấu cờ `is_used` / `can_use`.
* **Phản hồi thành công (`200 OK`):**
  ```json
  {
    "message": "Thành công",
    "data": [
      {
        "promotion_id": 1,
        "promotion_code": "SWEET10",
        "promotion_name": "Voucher Chào Bạn Mới",
        "description": "Giảm 10% tối đa 20.000đ cho đơn từ 80.000đ",
        "start_date": "2026-01-01T00:00:00",
        "end_date": "2026-12-31T23:59:59",
        "status": "Active",
        "usage_limit_per_user": 1,
        "used_by_current_user": 0,
        "is_used": false,
        "can_use": true,
        "min_order_value": 80000.0,
        "discount_percentage": 10.0,
        "max_discount_value": 20000.0,
        "invoice_promotions": [
          {
            "min_order_value": 80000.0,
            "discount_percentage": 10.0,
            "max_discount_value": 20000.0
          }
        ]
      }
    ]
  }
  ```

#### 2. Kiểm tra & Tính thử mức giảm giá của Voucher
* **Endpoint:** `POST /api/client/promotions/apply`
* **Header:** `Authorization: Bearer <token>` *(Optional)*
* **Request Body:**
  ```json
  {
    "promotion_code": "SWEET10",
    "order_amount": 150000.0
  }
  ```
* **Phản hồi thành công (`200 OK`):**
  ```json
  {
    "message": "Áp dụng mã khuyến mãi thành công",
    "data": {
      "promotion_id": 1,
      "promotion_code": "SWEET10",
      "promotion_name": "Voucher Chào Bạn Mới",
      "discount_amount": 15000.0,
      "final_amount": 135000.0
    }
  }
  ```

---

### 3.6. Đơn hàng & Đặt bánh (Orders)

#### 1. Đặt bánh mới (Checkout)
* **Endpoint:** `POST /api/client/orders`
* **Header:** `Authorization: Bearer <token>`
* **Mô tả:**
  * Tạo đơn hàng mới từ giỏ hàng hoặc danh sách món `items` gửi lên.
  * Tự động kiểm tra và áp dụng mã voucher `voucher_code` nếu có.
  * Kiểm tra tồn kho khả dụng và trừ trực tiếp tồn kho (`stock_quantity`) trong bảng `product_sizes`.
  * Lưu nhật ký áp dụng voucher vào `order_promotions`.
  * Tự động xóa giỏ hàng và ghi nhận lịch sử khởi tạo đơn vào `order_status_logs`.
* **Request Body:**
  ```json
  {
    "recipient_name": "Nguyễn Văn An",
    "recipient_phone": "0912345678",
    "pickup_time": "2026-10-21T18:30:00",
    "notes": "Ghi chữ Happy Birthday, thêm 1 bộ nến số 25",
    "payment_method": "COD",
    "voucher_code": "SWEET10",
    "items": [
      {
        "product_id": 1,
        "size_id": 1,
        "quantity": 2
      }
    ]
  }
  ```
* **Phản hồi thành công (`201 Created`):**
  ```json
  {
    "message": "Đặt hàng thành công",
    "data": {
      "order_id": 15,
      "order_code": "DHA1B2C3",
      "recipient_name": "Nguyễn Văn An",
      "recipient_phone": "0912345678",
      "pickup_time": "2026-10-21T18:30:00",
      "notes": "Ghi chữ Happy Birthday, thêm 1 bộ nến số 25",
      "promotion_id": 1,
      "promotion_code": "SWEET10",
      "total_quantity": 2,
      "total_cost": 260000.0,
      "discount_amount": 20000.0,
      "final_cost": 240000.0,
      "payment_method": "COD",
      "payment_status": "Unpaid",
      "status": "Pending",
      "order_date": "2026-10-21T17:00:00",
      "details": [
        {
          "product_id": 1,
          "product_name": "Tiramisu Mousse",
          "image": "/uploads/Mousse/Tiramisu_Mousse.jpg",
          "size_id": 1,
          "size_name": "Size S (16cm)",
          "quantity": 2,
          "price": 130000.0,
          "total_price": 260000.0,
          "note": null
        }
      ]
    }
  }
  ```

#### 2. Lấy lịch sử đơn hàng của tôi
* **Endpoint:** `GET /api/client/orders`
* **Header:** `Authorization: Bearer <token>`
* **Mô tả:** Trả về danh sách đơn hàng của khách hàng hiện tại, sắp xếp theo thứ tự đơn mới nhất lên đầu.

#### 3. Xem chi tiết đơn hàng
* **Endpoint:** `GET /api/client/orders/{order_id}`
* **Header:** `Authorization: Bearer <token>`
* **Mô tả:** Lấy đầy đủ thông tin chi tiết của 1 đơn hàng (chỉ xem được đơn của chính mình).

#### 4. Hủy đơn hàng đang chờ xử lý
* **Endpoint:** `PUT /api/client/orders/{order_id}/cancel`
* **Header:** `Authorization: Bearer <token>`
* **Mô tả:** Cho phép khách hàng hủy đơn khi đơn còn ở trạng thái `Pending`. Hệ thống tự động:
  * Chuyển trạng thái đơn sang `Cancelled`.
  * Hoàn trả lại số lượng bánh của các chi tiết đơn vào kho hàng (`stock_quantity`).
  * Ghi nhật ký vào bảng `order_status_logs`.
* **Request Body:**
  ```json
  {
    "note": "Tôi có việc đột xuất không ghé lấy được"
  }
  ```
* **Phản hồi thành công (`200 OK`):**
  ```json
  {
    "message": "Hủy đơn hàng thành công",
    "data": {
      "order_id": 15,
      "order_code": "DHA1B2C3",
      "status": "Cancelled",
      ...
    }
  }
  ```

---

## 4. CÁC QUY TẮC NGHIỆP VỤ CỐT LÕI (BUSINESS LOGIC)

1. **Khuyến mãi theo tổng tiền hóa đơn (`invoice_promotions`):**
   * Một chương trình khuyến mãi (`promotions`) có thể có nhiều bậc hóa đơn với mức tổng tiền tối thiểu (`min_order_value`), tỉ lệ phần trăm giảm (`discount_percentage`) và số tiền giảm tối đa (`max_discount_value`).
   * Hệ thống tự động chọn bậc ưu đãi cao nhất mà đơn hàng thỏa mãn.
   * Kiểm soát chặt chẽ số lần sử dụng tối đa của từng tài khoản (`usage_limit_per_user`) và toàn hệ thống (`total_usage_limit`). Đơn đã bị hủy (`Cancelled`) sẽ không bị tính vào số lần đã dùng.
2. **Kiểm soát tính toàn vẹn tồn kho (`stock_quantity`):**
   * Khi thêm vào giỏ hoặc đặt hàng, hệ thống kiểm tra số lượng tồn kho theo cặp `(product_id, size_id)` trong bảng `product_sizes`.
   * Khi đặt hàng thành công: Tồn kho bị trừ ngay lập tức.
   * Khi khách hủy đơn (ở trạng thái `Pending`): Toàn bộ số lượng bánh trong chi tiết đơn hàng được hoàn trả lại kho.
3. **Mô hình nhận bánh tại quầy (Pick-up):**
   * Đơn hàng lưu thông tin người nhận bánh (`recipient_name`, `recipient_phone`), thời gian hẹn lấy bánh (`pickup_time`), và ghi chú làm bánh (`notes`).

---

## 5. ĐỒNG BỘ VỚI FRONTEND WEB

1. **Module gọi API [web/frontend/src/api/client/index.js](file:///d:/Bakery-Sweets/web/frontend/src/api/client/index.js):**
   * Đã bổ sung hàm `cancelOrder(id, data)` vào `clientOrdersApi`.
   * Đã bổ sung `clientPromotionsApi` (`getAll`, `apply`).
2. **Trang thanh toán [web/frontend/src/client/pages/Pay.jsx](file:///d:/Bakery-Sweets/web/frontend/src/client/pages/Pay.jsx):**
   * Đã kết nối truyền `voucher_code` trực tiếp khi submit form thanh toán `createOrder`.

---

## 6. BÁO CÁO KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (PYTEST)

Hệ thống đã được kiểm thử toàn diện bằng bộ test suite tự động với SQLite In-Memory Database (độc lập, cách ly, kiểm thử mọi điều kiện biên):

```powershell
python -m pytest web/backend/tests -v
```

### Kết quả chi tiết (36/36 Tests Passed - 100%):
* ✅ `test_client_auth.py`: 8/8 tests (Đăng ký mới, trùng phone, trùng email, đăng nhập thành công, đăng nhập sai mật khẩu, tài khoản bị khóa, lấy me, token không hợp lệ).
* ✅ `test_client_profile.py`: 6/6 tests (Cập nhật họ tên, cập nhật email, trùng email người khác, đổi mật khẩu đúng, sai mật khẩu cũ, mật khẩu mới trùng mật khẩu cũ).
* ✅ `test_client_products.py`: 7/7 tests (Lấy danh mục, lấy danh sách sản phẩm, lọc theo tên danh mục, lọc theo ID danh mục, tìm kiếm từ khóa, xem chi tiết, báo lỗi 404 khi không tìm thấy).
* ✅ `test_client_cart.py`: 4/4 tests (Workflow thêm/sửa/xóa giỏ hàng, kiểm tra hết hàng trong kho, kiểm tra kích cỡ không tồn tại, cập nhật món không tồn tại).
* ✅ `test_client_promotions.py`: 5/5 tests (Lấy danh sách voucher, tính giảm giá theo %, áp dụng mức giảm tối đa, kiểm tra chưa đủ đơn tối thiểu, mã không tồn tại).
* ✅ `test_client_orders.py`: 6/6 tests (Đặt hàng từ giỏ hàng tự xóa giỏ, đặt hàng kèm voucher, đặt hàng vượt tồn kho báo lỗi, lấy lịch sử và chi tiết đơn, hủy đơn Pending hoàn lại tồn kho, chặn hủy đơn của người khác).

**Tổng kết:** **36 passed, 0 failed trong 113.34 giây.**

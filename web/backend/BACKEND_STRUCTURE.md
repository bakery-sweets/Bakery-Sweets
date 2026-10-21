# 📚 TÀI LIỆU CHI TIẾT CẤU TRÚC VÀ CHỨC NĂNG BACKEND (WEB)
**Dự án:** The Sweets — Bakery & Sweets (Web Backend)  
**Công nghệ:** Python 3.11+, FastAPI, SQLAlchemy 2.0, PyMySQL, Pydantic V2, Uvicorn, Jose JWT, Bcrypt.

---

## 📑 MỤC LỤC
1. [Tổng quan kiến trúc phân tầng](#1-tổng-quan-kiến-trúc-phân-tầng)
2. [Sơ đồ cây thư mục tổng thể](#2-sơ-đồ-cây-thư-mục-tổng-thể)
3. [Chi tiết thư mục gốc (`web/backend/`)](#3-chi-tiết-thư-mục-gốc-webbackend)
4. [Thư mục `app/core/` (Cấu hình & Bảo mật)](#4-thư-mục-appcore-cấu-hình--bảo-mật)
5. [Thư mục `app/database/` (Kết nối CSDL)](#5-thư-mục-appdatabase-kết-nối-csdl)
6. [Thư mục `app/models/` (ORM Models CSDL)](#6-thư-mục-appmodels-orm-models-csdl)
7. [Thư mục `app/api/` (API Router & Controllers)](#7-thư-mục-appapi-api-router--controllers)
   - [Dependency Injection (`deps.py`)](#71-dependency-injection-appapidepspy)
   - [Cụm API Quản trị viên (`app/api/admin/`)](#72-cụm-api-quản-trị-viên-appapiadmin)
   - [Cụm API Khách hàng (`app/api/client/`)](#73-cụm-api-khách-hàng-appapiclient)
8. [Thư mục `app/schemas/` (Pydantic DTO & Data Validation)](#8-thư-mục-appschemas-pydantic-dto--data-validation)
   - [Schemas dùng chung (`common.py`)](#81-schemas-dùng-chung-appschemascommonpy)
   - [Schemas Quản trị viên (`app/schemas/admin/`)](#82-schemas-quản-trị-viên-appschemasadmin)
   - [Schemas Khách hàng (`app/schemas/client/`)](#83-schemas-khách-hàng-appschemasclient)
9. [Thư mục `app/services/` (Tầng Xử lý Nghiệp vụ - Business Logic)](#9-thư-mục-appservices-tầng-xử-lý-nghiệp-vụ---business-logic)
   - [Services Quản trị viên (`app/services/admin/`)](#91-services-quản-trị-viên-appservicesadmin)
   - [Services Khách hàng (`app/services/client/`)](#92-services-khách-hàng-appservicesclient)
10. [Quy trình luồng dữ liệu (Data Request Flow)](#10-quy-trình-luồng-dữ-liệu-data-request-flow)

---

## 1. Tổng quan kiến trúc phân tầng

Backend được thiết kế theo mô hình **3 lớp phân tách trách nhiệm (Layered Clean Architecture)**:
1. **API Router / Controller (`app/api/`)**: Tiếp nhận HTTP request từ React frontend, xác thực quyền (Admin / Customer) qua `deps.py`, kiểm định tham số đầu vào qua Pydantic Schema và trả về JSON chuẩn.
2. **Business Service Layer (`app/services/`)**: Chứa toàn bộ logic nghiệp vụ (tính toán tiền, giảm giá voucher, trừ tồn kho, cập nhật lịch sử trạng thái đơn hàng, thống kê số liệu).
3. **Data Access / ORM Layer (`app/models/` & `app/database/`)**: Khai báo ánh xạ các bảng CSDL MySQL/MariaDB qua SQLAlchemy ORM và quản lý vòng đời Session kết nối.

Hệ thống được chia tách rành mạch thành **2 phân hệ riêng biệt**:
- `/api/admin/*`: Dành riêng cho trang Quản trị (Admin Portal).
- `/api/client/*`: Dành cho trang Khách hàng mua sắm (Storefront).

---

## 2. Sơ đồ cây thư mục tổng thể

```text
web/backend/
├── .dockerignore
├── .env.example
├── Dockerfile
├── main.py
├── README.md
├── requirements.txt
└── app/
    ├── __init__.py
    ├── api/
    │   ├── __init__.py
    │   ├── deps.py                      # Xác thực JWT Token & Phân quyền User/Admin
    │   ├── admin/                       # Các Endpoint cho trang Admin Dashboard
    │   │   ├── __init__.py
    │   │   ├── api.py                   # Gom nhóm router admin (/api/admin)
    │   │   ├── auth.py                  # Đăng nhập Admin & lấy thông tin me
    │   │   ├── dashboard.py             # Thống kê tổng quan trang chủ Admin
    │   │   ├── orders.py                # Quản lý & duyệt trạng thái đơn hàng
    │   │   ├── products.py              # CRUD sản phẩm, size, danh mục bánh
    │   │   ├── statistical.py           # Báo cáo doanh thu, sản phẩm bán chạy
    │   │   └── users.py                 # Quản lý danh sách tài khoản & khóa/mở khóa
    │   └── client/                      # Các Endpoint cho khách hàng ngoài Web
    │       ├── __init__.py
    │       ├── api.py                   # Gom nhóm router client (/api/client)
    │       ├── auth.py                  # Đăng ký, đăng nhập khách hàng
    │       ├── cart.py                  # Thêm giỏ hàng, sửa số lượng, xóa giỏ
    │       ├── orders.py                # Checkout tạo đơn, xem hóa đơn (/receipt)
    │       ├── products.py              # Xem menu, tìm kiếm, lọc danh mục, chi tiết bánh
    │       ├── profile.py               # Xem & cập nhật thông tin cá nhân khách
    │       └── promotions.py            # Xem voucher ưu đãi & áp mã giảm giá
    │
    ├── core/                            # Cấu hình hệ thống & cơ chế bảo mật
    │   ├── __init__.py
    │   ├── config.py                    # Đọc biến môi trường (.env), CORS, Database URL
    │   └── security.py                  # Bcrypt mã hóa mật khẩu & xử lý JWT Token
    │
    ├── database/                        # Kết nối cơ sở dữ liệu
    │   ├── __init__.py
    │   └── session.py                   # SQLAlchemy Engine, SessionLocal, Base model
    │
    ├── models/                          # Khai báo các Entity ORM (SQLAlchemy)
    │   ├── __init__.py
    │   ├── user.py                      # Bảng users & customers
    │   ├── product.py                   # Bảng category, size, product, product_sizes
    │   ├── order.py                     # Bảng cart, orders, order_detail, order_status_logs
    │   └── promotion.py                 # Bảng promotions, invoice_promotions, order_promotions
    │
    ├── schemas/                         # Pydantic Schemas (Request/Response DTO)
    │   ├── __init__.py
    │   ├── common.py                    # Khung phản hồi ResponseBase & PaginationParams
    │   ├── admin/                       # Schemas định dạng dữ liệu cho Admin
    │   │   ├── __init__.py
    │   │   ├── auth.py                  # Request/Response đăng nhập admin
    │   │   ├── order.py                 # DTO xem đơn & cập nhật trạng thái
    │   │   ├── product.py               # DTO tạo/sửa bánh, size, danh mục
    │   │   └── statistical.py           # DTO số liệu biểu đồ & doanh thu
    │   └── client/                      # Schemas định dạng dữ liệu cho Khách hàng
    │       ├── __init__.py
    │       ├── auth.py                  # DTO đăng ký, đăng nhập, thông tin tài khoản
    │       ├── cart.py                  # DTO thêm giỏ hàng, cập nhật giỏ
    │       ├── order.py                 # DTO tạo đơn checkout, danh sách hóa đơn
    │       ├── product.py               # DTO danh sách món, chi tiết món kèm size
    │       └── promotion.py             # DTO kiểm tra mã voucher & giảm giá
    │
    └── services/                        # Logic nghiệp vụ (Truy vấn CSDL & Xử lý)
        ├── __init__.py
        ├── admin/
        │   ├── __init__.py
        │   ├── order_service.py         # Nghiệp vụ duyệt đơn & ghi log trạng thái
        │   ├── product_service.py       # Nghiệp vụ thêm, sửa, xóa món, điều chỉnh giá/kho
        │   └── stats_service.py         # Nghiệp vụ tính toán doanh thu & top sản phẩm
        └── client/
            ├── __init__.py
            ├── cart_service.py          # Nghiệp vụ đồng bộ giỏ hàng khách
            ├── order_service.py         # Nghiệp vụ checkout, sinh mã đơn, tính tổng tiền
            ├── product_service.py       # Nghiệp vụ tìm kiếm, lọc phân loại bánh
            └── promotion_service.py     # Nghiệp vụ kiểm tra điều kiện & tính tiền voucher
```

---

## 3. Chi tiết thư mục gốc (`web/backend/`)

| File | Chức năng chính |
| :--- | :--- |
| `main.py` | **File khởi chạy chính của toàn bộ Backend FastAPI.**<br>• Khởi tạo đối tượng `app = FastAPI(...)`<br>• Đăng ký Middleware CORS để cho phép Frontend (Vite port 3000) gọi API<br>• Gắn 2 cụm router chính: `/api/admin` và `/api/client`<br>• Khởi tạo metadata DB khi khởi động (`lifespan`)<br>• Cung cấp các endpoint kiểm tra trạng thái (`/`, `/health`). |
| `requirements.txt` | **Danh sách các thư viện Python phụ thuộc.**<br>Gồm: `fastapi`, `uvicorn`, `sqlalchemy`, `pymysql`, `pydantic`, `pydantic-settings`, `python-jose`, `passlib[bcrypt]`, `python-dotenv`, `python-multipart`. |
| `Dockerfile` | **Cấu hình đóng gói container Docker cho Backend.**<br>Cài đặt dependencies và chạy server Uvicorn tự động trên port 5000 khi deploy. |
| `.env.example` | **File mẫu chứa các biến môi trường.**<br>Khai báo host DB, port, user, mật khẩu, JWT Secret key và thời gian hết hạn token. |
| `.dockerignore` | **Loại trừ các file không cần thiết khi build Docker image.**<br>Loại bỏ `__pycache__`, `.env`, `.git`, v.v. |
| `README.md` | **Tài liệu hướng dẫn nhanh.**<br>Cung cấp lệnh cài đặt môi trường, cách chạy dev server và mô tả sơ bộ. |

---

## 4. Thư mục `app/core/` (Cấu hình & Bảo mật)

Thư mục này chứa các thiết lập nền tảng, độc lập với logic nghiệp vụ.

| File | Chức năng chi tiết |
| :--- | :--- |
| `config.py` | **Quản lý cấu hình tập trung (Pydantic `BaseSettings`).**<br>• Tự động đọc file `.env` qua `python-dotenv`<br>• Định nghĩa biến: `PROJECT_NAME`, `VERSION`, `API_PREFIX`, `PORT`<br>• Ghép nối chuỗi kết nối CSDL: `DATABASE_URL = mysql+pymysql://user:pass@host:port/dbname?charset=utf8mb4`<br>• Cấu hình thông số bảo mật: `SECRET_KEY`, `ALGORITHM` (HS256), `ACCESS_TOKEN_EXPIRE_MINUTES`<br>• Danh sách nguồn CORS cho phép (`BACKEND_CORS_ORIGINS`). |
| `security.py` | **Cơ chế mã hóa mật khẩu & xử lý JWT Token.**<br>• `verify_password(plain, hashed)`: So khớp mật khẩu nhập vào với mật khẩu đã mã hóa trong DB (tự động chuyển đổi prefix `$2y$` của PHP sang `$2b$` để tương thích tuyệt đối với Python Bcrypt).<br>• `get_password_hash(password)`: Mã hóa mật khẩu người dùng thành chuỗi băm Bcrypt an toàn.<br>• `create_access_token(data, expires_delta)`: Tạo mã JWT Token kèm thời gian hết hạn.<br>• `decode_access_token(token)`: Giải mã và kiểm tra token hợp lệ khi người dùng gửi request. |

---

## 5. Thư mục `app/database/` (Kết nối CSDL)

Quản lý việc kết nối và cung cấp phiên làm việc với MariaDB / MySQL.

| File | Chức năng chi tiết |
| :--- | :--- |
| `session.py` | **Cấu hình SQLAlchemy Engine & Session Factory.**<br>• `create_engine`: Kết nối tới CSDL với `pool_size=10`, `pool_recycle=3600`, `pool_pre_ping=True` (chống rớt kết nối).<br>• `SessionLocal`: Factory sinh ra phiên làm việc `Session` với database.<br>• `Base`: Khung cha ORM `declarative_base()` để tất cả các Model kế thừa.<br>• `get_db()`: Generator Dependency cung cấp `db: Session` cho mỗi HTTP request và tự động giải phóng (`db.close()`) sau khi hoàn thành. |

---

## 6. Thư mục `app/models/` (ORM Models CSDL)

Chứa các class SQLAlchemy tương ứng 1-1 với cấu trúc các bảng trong cơ sở dữ liệu (`database/createTable.sql`).

| File | Entity / Class Model | Chức năng & Quan hệ CSDL |
| :--- | :--- | :--- |
| `user.py` | • `User`<br>• `Customer` | **Quản lý tài khoản & hồ sơ khách hàng.**<br>• `User`: Bảng `users` lưu số điện thoại (`phone` - PK), email, mật khẩu băm, quyền (`role`: customer/admin), trạng thái (`status`: active/locked).<br>• `Customer`: Bảng `customers` lưu thông tin cá nhân: họ tên (`first_name`, `last_name`), liên kết 1-1 với `User` qua khóa ngoại `phone`. |
| `product.py` | • `Category`<br>• `Size`<br>• `Product`<br>• `ProductSize` | **Quản lý danh mục, kích thước và sản phẩm bánh.**<br>• `Category`: Bảng `category` lưu tên phân loại bánh (Bánh kem, Bánh mì, v.v.).<br>• `Size`: Bảng `size` lưu định nghĩa kích cỡ (Size S, M, L, Tiêu chuẩn...).<br>• `Product`: Bảng `product` lưu tên món bánh, mô tả nguyên liệu, hạn dùng, hướng dẫn bảo quản, ảnh đại diện, trạng thái (Available, Out of Stock, v.v.).<br>• `ProductSize`: Bảng trung gian `product_sizes` gắn sản phẩm với từng kích cỡ kèm **giá tiền (`price`)** và **tồn kho (`stock_quantity`)**. |
| `order.py` | • `Cart`<br>• `Order`<br>• `OrderDetail`<br>• `OrderStatusLog` | **Quản lý giỏ hàng, đơn hàng và lịch sử trạng thái.**<br>• `Cart`: Bảng `cart` lưu các món khách đã thêm vào giỏ hàng (`customer_id`, `product_id`, `size_id`, `quantity`).<br>• `Order`: Bảng `orders` lưu thông tin đơn hàng: mã đơn (`order_code`), người nhận, SĐT, giờ hẹn lấy bánh, ghi chú, voucher áp dụng, tổng tiền, tiền giảm, hình thức thanh toán, trạng thái đơn (Pending, Processing, Ready, Completed, Cancelled).<br>• `OrderDetail`: Bảng `order_detail` lưu từng món bánh trong đơn (sản phẩm, size, số lượng, đơn giá lúc mua).<br>• `OrderStatusLog`: Bảng `order_status_logs` ghi nhận vết thay đổi trạng thái (ai đổi, trạng thái cũ, trạng thái mới, thời gian). |
| `promotion.py` | • `Promotion`<br>• `InvoicePromotion`<br>• `OrderPromotion` | **Quản lý chương trình khuyến mãi & Voucher.**<br>• `Promotion`: Bảng `promotions` lưu mã giảm giá (`promotion_code`), tên chương trình, ngày bắt đầu, ngày hết hạn, giới hạn số lần dùng.<br>• `InvoicePromotion`: Bảng `invoice_promotions` quy định mức giảm (%) theo giá trị đơn hàng tối thiểu (`min_order_value`) và mức giảm tối đa (`max_discount_value`).<br>• `OrderPromotion`: Bảng `order_promotions` lưu vết giảm giá thực tế đã áp dụng vào đơn hàng. |

---

## 7. Thư mục `app/api/` (API Router & Controllers)

Nơi tiếp nhận các yêu cầu HTTP và gọi các hàm xử lý tương ứng.

### 7.1. Dependency Injection (`app/api/deps.py`)
File quan trọng nhất trong việc kiểm soát bảo mật và phân quyền:
- `get_db()`: Cung cấp kết nối CSDL sạch cho mỗi request.
- `get_current_user()`: Trích xuất `Bearer <token>` từ header `Authorization`, giải mã JWT, lấy số điện thoại và truy vấn tài khoản `User`. Nếu tài khoản bị `locked` thì lập tức trả về lỗi HTTP 403.
- `get_current_admin()`: Dùng cho các route quản trị, kiểm tra `current_user.role == "admin"`, nếu không phải admin sẽ chặn ngay lập tức (HTTP 403).
- `get_current_customer()`: Kiểm tra quyền khách hàng.
- `get_optional_current_user()`: Lấy thông tin user nếu có gửi token, nhưng không báo lỗi 401 nếu chưa đăng nhập (dùng cho các API công khai cho cả khách vãng lai lẫn thành viên).

---

### 7.2. Cụm API Quản trị viên (`app/api/admin/`)
Toàn bộ route bắt đầu bằng tiền tố `/api/admin`:

| File | Đường dẫn API | Chức năng chi tiết |
| :--- | :--- | :--- |
| `api.py` | `/api/admin/*` | Gom toàn bộ router con của Admin lại thành một `admin_router` duy nhất để gắn vào `main.py`. |
| `auth.py` | `/auth/login`<br>`/auth/me` | • Đăng nhập tài khoản quản trị (yêu cầu role `admin`).<br>• Trả về JWT Token và thông tin cá nhân admin hiện tại. |
| `dashboard.py` | `/dashboard/overview` | Trả về các chỉ số KPI trên màn hình chính: Doanh thu hôm nay, tổng số đơn hàng mới, số khách hàng, cảnh báo tồn kho sắp hết. |
| `products.py` | `/products/*`<br>`/categories`<br>`/sizes` | • Quản lý danh mục bánh & kích thước.<br>• Lấy danh sách sản phẩm (có lọc theo danh mục, trạng thái).<br>• Tạo mới sản phẩm kèm các kích cỡ & giá bán.<br>• Cập nhật thông tin bánh, sửa giá theo size, cập nhật kho.<br>• Bật/tắt trạng thái ẩn/hiện hoặc xóa sản phẩm. |
| `orders.py` | `/orders/*` | • Xem toàn bộ danh sách đơn hàng của tiệm (lọc theo trạng thái).<br>• Xem chi tiết 1 đơn hàng (thông tin người nhận, danh sách món, tiền thanh toán).<br>• Cập nhật trạng thái đơn (từ `Pending` -> `Processing` -> `Ready` -> `Completed` hoặc `Cancelled`).<br>• Tự động ghi log vào bảng `order_status_logs`. |
| `users.py` | `/users/*` | • Lấy danh sách toàn bộ tài khoản người dùng trong hệ thống (khách hàng / admin).<br>• Khóa (`locked`) hoặc Mở khóa (`active`) tài khoản người dùng khi vi phạm. |
| `statistical.py` | `/statistical/revenue`<br>`/statistical/top-products` | • Thống kê doanh thu theo ngày, tuần, tháng.<br>• Báo cáo danh sách các món bánh bán chạy nhất (Top selling). |

---

### 7.3. Cụm API Khách hàng (`app/api/client/`)
Toàn bộ route bắt đầu bằng tiền tố `/api/client`:

| File | Đường dẫn API | Chức năng chi tiết |
| :--- | :--- | :--- |
| `api.py` | `/api/client/*` | Gom toàn bộ router con của Client thành `client_router` để gắn vào `main.py`. |
| `auth.py` | `/auth/register`<br>`/auth/login`<br>`/auth/me`<br>`/auth/check-phone` | • Khách hàng đăng ký tài khoản (tạo cả bản ghi `User` và `Customer`).<br>• Đăng nhập bằng số điện thoại & mật khẩu.<br>• Kiểm tra nhanh SĐT hoặc email đã tồn tại hay chưa.<br>• Lấy thông tin tài khoản đang đăng nhập. |
| `products.py` | `/products`<br>`/products/{id}`<br>`/categories` | • Xem menu bánh phía khách hàng.<br>• Tìm kiếm món theo từ khóa, lọc theo danh mục, sắp xếp giá.<br>• Xem chi tiết từng món bánh kèm bảng kích cỡ, giá tương ứng và ảnh. |
| `cart.py` | `/cart`<br>`/cart/items` | • Xem giỏ hàng của khách hàng hiện tại.<br>• Thêm món vào giỏ hàng (chọn bánh + kích cỡ + số lượng).<br>• Cập nhật số lượng món trong giỏ hàng.<br>• Xóa từng món hoặc làm rỗng giỏ hàng. |
| `orders.py` | `/orders/checkout`<br>`/orders/my-orders`<br>`/orders/{id}`<br>`/orders/{id}/cancel` | • **Đặt hàng (Checkout):** Nhận thông tin người nhận, SĐT, giờ hẹn lấy bánh, ghi chú, mã voucher; tự động tính tổng tiền và tạo đơn.<br>• **Lịch sử hóa đơn (`/my-orders`):** Cung cấp dữ liệu cho trang `/receipt` (gồm tổng số lượng, tóm tắt các món, trạng thái).<br>• Xem chi tiết hóa đơn (phục vụ hiển thị Popup modal chi tiết hóa đơn).<br>• Khách tự hủy đơn hàng khi đơn còn ở trạng thái `Pending`. |
| `promotions.py` | `/promotions`<br>`/promotions/apply` | • Xem danh sách các voucher khuyến mãi đang có hiệu lực (`Active`).<br>• Nhập mã voucher để kiểm tra điều kiện áp dụng và xem trước số tiền được giảm giá. |
| `profile.py` | `/profile`<br>`/profile/password` | • Xem thông tin cá nhân khách hàng (họ tên, SĐT, email).<br>• Cập nhật họ tên, thông tin liên lạc.<br>• Đổi mật khẩu tài khoản. |

---

## 8. Thư mục `app/schemas/` (Pydantic DTO & Data Validation)

Định nghĩa cấu trúc dữ liệu đầu vào (Request body) và đầu ra (Response body). Đảm bảo tính toàn vẹn dữ liệu, tự động sinh tài liệu Swagger UI (`/docs`).

### 8.1. Schemas dùng chung (`app/schemas/common.py`)
- `ResponseBase[T]`: Cấu trúc JSON phản hồi tiêu chuẩn cho toàn bộ API:
  ```json
  {
    "success": true,
    "message": "Thành công",
    "data": { ... }
  }
  ```
- `PaginationParams`: Tham số phân trang chuẩn (`page`, `page_size`).
- `PaginatedResponse[T]`: Cấu trúc dữ liệu danh sách có phân trang (`items`, `total`, `page`, `page_size`, `total_pages`).

---

### 8.2. Schemas Quản trị viên (`app/schemas/admin/`)

| File | Các Schemas chính | Ý nghĩa |
| :--- | :--- | :--- |
| `auth.py` | • `AdminLoginRequest`<br>• `AdminLoginResponse`<br>• `AdminProfileOut` | Định dạng dữ liệu đăng nhập admin, mã Token trả về và thông tin tài khoản admin. |
| `product.py` | • `ProductCreateIn`<br>• `ProductUpdateIn`<br>• `ProductSizeIn`<br>• `AdminProductOut`<br>• `CategoryOut` | Định dạng dữ liệu khi admin thêm bánh mới, sửa mô tả, cấu hình giá tiền và số lượng tồn kho theo từng size bánh. |
| `order.py` | • `AdminOrderFilter`<br>• `AdminOrderListOut`<br>• `AdminOrderDetailOut`<br>• `UpdateOrderStatusIn` | Định dạng bộ lọc tìm đơn hàng, dữ liệu danh sách đơn, chi tiết đơn kèm log lịch sử và request đổi trạng thái. |
| `statistical.py` | • `DashboardOverviewOut`<br>• `RevenueReportItem`<br>• `TopProductItem` | Định dạng các số liệu thống kê doanh số, số đơn hàng và danh sách sản phẩm bán chạy. |

---

### 8.3. Schemas Khách hàng (`app/schemas/client/`)

| File | Các Schemas chính | Ý nghĩa |
| :--- | :--- | :--- |
| `auth.py` | • `ClientRegisterIn`<br>• `ClientLoginIn`<br>• `ClientAuthTokenOut`<br>• `ClientProfileOut`<br>• `ChangePasswordIn` | Định dạng dữ liệu khi khách đăng ký, đăng nhập, đổi mật khẩu và xem thông tin cá nhân. |
| `product.py` | • `ClientProductListOut`<br>• `ClientProductDetailOut`<br>• `ClientSizeOptionOut` | Định dạng dữ liệu trả về khi khách lướt danh sách bánh, xem chi tiết sản phẩm và các tùy chọn size/giá. |
| `cart.py` | • `AddToCartIn`<br>• `UpdateCartItemIn`<br>• `CartItemOut`<br>• `CartSummaryOut` | Dữ liệu thêm món vào giỏ (product_id, size_id, số lượng), cập nhật số lượng và tổng kết giỏ hàng. |
| `order.py` | • `CheckoutRequest`<br>• `CheckoutItem`<br>• `ClientOrderOut`<br>• `ClientOrderDetailOut`<br>• `CancelOrderIn` | Dữ liệu gửi lên khi đặt hàng, và định dạng dữ liệu trả về cho trang hóa đơn `/receipt` và Popup chi tiết. |
| `promotion.py` | • `PromotionItemOut`<br>• `ApplyPromotionIn`<br>• `ApplyPromotionOut` | Dữ liệu danh sách voucher và kết quả tính toán số tiền giảm khi khách nhập mã khuyến mãi. |

---

## 9. Thư mục `app/services/` (Tầng Xử lý Nghiệp vụ - Business Logic)

Tách biệt hoàn toàn việc truy vấn CSDL và tính toán logic khỏi các file Controller/Router, giúp mã nguồn sạch sẽ, dễ bảo trì và dễ viết Unit Test.

### 9.1. Services Quản trị viên (`app/services/admin/`)

| File | Service Class | Chức năng chi tiết |
| :--- | :--- | :--- |
| `product_service.py` | `AdminProductService` | • Truy vấn danh sách bánh trong kho kèm các kích cỡ.<br>• Thêm mới bánh vào bảng `product` và sinh bản ghi tương ứng trong `product_sizes`.<br>• Cập nhật thông tin bánh, đồng bộ giá tiền & số lượng kho cho từng size.<br>• Ẩn hoặc xóa bánh. |
| `order_service.py` | `AdminOrderService` | • Lấy danh sách toàn bộ đơn hàng của tiệm, lọc theo trạng thái (`Pending`, `Processing`, v.v.).<br>• Lấy chi tiết đơn hàng kèm danh sách món con.<br>• Chuyển đổi trạng thái đơn hàng và **tự động lưu vết** vào bảng `order_status_logs` (ghi lại ai là người đổi, trạng thái cũ, trạng thái mới và thời gian). |
| `stats_service.py` | `AdminStatsService` | • Tính toán các số liệu tổng quan trên Dashboard (tổng đơn, tổng tiền, khách hàng mới).<br>• Thống kê doanh thu theo khoảng thời gian.<br>• Truy vấn danh sách các món bánh bán chạy nhất dựa trên tổng số lượng đã hoàn thành trong bảng `order_detail`. |

---

### 9.2. Services Khách hàng (`app/services/client/`)

| File | Service Class | Chức năng chi tiết |
| :--- | :--- | :--- |
| `product_service.py` | `ClientProductService` | • Lấy danh sách sản phẩm hiển thị ra ngoài cửa hàng (chỉ lấy các sản phẩm có trạng thái `Available`).<br>• Xử lý tìm kiếm theo tên bánh, lọc theo danh mục (`category_id`) và sắp xếp theo giá tăng/giảm.<br>• Lấy chi tiết thông tin món bánh kèm danh sách size để khách chọn. |
| `cart_service.py` | `ClientCartService` | • Quản lý các món hàng trong giỏ của khách hàng đã đăng nhập.<br>• Kiểm tra nếu món + size đã có trong giỏ thì cộng dồn số lượng; nếu chưa có thì thêm mới bản ghi vào bảng `cart`.<br>• Cập nhật lại số lượng hoặc xóa món khỏi giỏ hàng. |
| `order_service.py` | `ClientOrderService` | • **Nghiệp vụ tạo đơn hàng (Checkout):**<br>&nbsp;&nbsp;1. Sinh mã đơn hàng tự động định dạng `DHxxxxxx`.<br>&nbsp;&nbsp;2. Lấy danh sách món từ giỏ hàng hoặc từ request gửi lên.<br>&nbsp;&nbsp;3. Kiểm tra tính hợp lệ của mã voucher (nếu có) và tính số tiền chiết khấu.<br>&nbsp;&nbsp;4. Tính toán tổng số lượng món (`total_quantity`), tổng chi phí (`total_cost`) và số tiền thực thu (`final_cost`).<br>&nbsp;&nbsp;5. Lưu bản ghi vào bảng `orders`, `order_detail` và `order_promotions`.<br>&nbsp;&nbsp;6. Tự động dọn sạch giỏ hàng của khách sau khi đặt thành công.<br>• **Lấy lịch sử hóa đơn khách hàng:** Truy vấn danh sách đơn hàng của chính khách đó, sắp xếp theo thời gian mới nhất để hiển thị tại trang `/receipt`.<br>• **Hủy đơn hàng:** Cho phép khách tự hủy đơn nếu tiệm chưa chuyển sang trạng thái chế biến (`Processing`). |
| `promotion_service.py` | `ClientPromotionService` | • Lấy danh sách các voucher còn hạn và trạng thái `Active`.<br>• Kiểm tra điều kiện áp dụng của voucher: thời hạn (start_date <= hiện tại <= end_date), giá trị đơn hàng có đạt mức tối thiểu (`min_order_value`) hay không.<br>• Tính số tiền giảm giá chính xác theo % chiết khấu và chặn ở mức giảm tối đa (`max_discount_value`). |

---

## 10. Quy trình luồng dữ liệu (Data Request Flow)

Ví dụ minh họa luồng thực thi khi người dùng thực hiện một thao tác (ví dụ: **Đặt hàng / Checkout**):

```mermaid
sequenceDiagram
    autonumber
    actor Client as React Frontend
    participant CORS as Middleware (CORS)
    participant Dep as Dependencies (deps.py)
    participant Router as API Router (orders.py)
    participant Schema as Pydantic Schema (order.py)
    participant Service as ClientOrderService
    participant DB as MariaDB / MySQL

    Client->>CORS: Gửi HTTP POST /api/client/orders/checkout kèm Token JWT
    CORS->>Dep: Chuyển tiếp request
    Dep->>Dep: Giải mã JWT -> Lấy User & Customer ID từ DB
    Dep->>Router: Bàn giao DB Session và Thông tin Customer
    Router->>Schema: Validate dữ liệu đầu vào (CheckoutRequest)
    Schema-->>Router: Dữ liệu hợp lệ
    Router->>Service: Gọi ClientOrderService.create_order(db, customer_id, data)
    Service->>DB: Kiểm tra món trong giỏ, tính tiền & áp voucher
    Service->>DB: INSERT vào bảng orders & order_detail, DELETE bảng cart
    DB-->>Service: Xác nhận lưu đơn thành công
    Service-->>Router: Trả về đối tượng Order đã tạo
    Router-->>Client: Trả về ResponseBase[ClientOrderOut] (HTTP 200)
```

---

*Tài liệu này được tạo tự động để hỗ trợ việc tra cứu, phát triển và bảo trì hệ thống Backend của The Sweets Bakery.*

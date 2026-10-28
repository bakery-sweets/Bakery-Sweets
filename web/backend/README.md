# 🌐 Web Backend — Python FastAPI

Hệ thống Backend phục vụ ứng dụng **Web (Admin Portal & Client Storefront)** của Tiệm Bánh The Sweets.

---

## 🛠 Công nghệ sử dụng
- **Framework:** Python FastAPI (>= 0.115)
- **ASGI Server:** Uvicorn
- **ORM:** SQLAlchemy 2.0
- **Database Driver:** PyMySQL (kết nối MySQL/MariaDB)
- **Xác thực:** JWT (JSON Web Tokens) qua `python-jose` & `passlib[bcrypt]`
- **Validation:** Pydantic V2

---

## 📂 Cấu trúc thư mục (Phân tách Admin & Client)

> 📖 **Xem tài liệu chi tiết đầy đủ về từng file và chức năng:** [BACKEND_STRUCTURE.md](BACKEND_STRUCTURE.md)

```text
web/backend/
├── app/
│   ├── api/                      # Tầng Router API
│   │   ├── deps.py               # Dependency Injection (DB session, Auth token, Role check)
│   │   ├── admin/                # 🛡️ Module API Quản trị (Admin / Staff)
│   │   │   ├── api.py            # Router tổng hợp Admin (/api/admin)
│   │   │   ├── auth.py           # Đăng nhập admin, lấy hồ sơ
│   │   │   ├── dashboard.py      # Thống kê tổng quan thẻ Dashboard
│   │   │   ├── employees.py      # CRUD Quản lý nhân viên
│   │   │   ├── orders.py         # Quản lý & duyệt đơn hàng
│   │   │   ├── products.py       # CRUD Quản lý món bánh, định giá, size
│   │   │   ├── statistical.py    # Báo cáo doanh thu & mặt hàng bán chạy
│   │   │   └── users.py          # Quản lý danh sách & trạng thái tài khoản
│   │   └── client/               # 🛒 Module API Khách hàng (Client / Customer)
│   │       ├── api.py            # Router tổng hợp Client (/api/client)
│   │       ├── auth.py           # Đăng ký, đăng nhập tài khoản khách
│   │       ├── cart.py           # Giỏ hàng (thêm, cập nhật số lượng, xóa)
│   │       ├── orders.py         # Checkout đặt hàng & lịch sử hóa đơn
│   │       ├── products.py       # Xem danh mục, danh sách bánh, chi tiết bánh
│   │       └── profile.py        # Xem & cập nhật thông tin cá nhân
│   │
│   ├── core/                     # Cấu hình cốt lõi & Bảo mật
│   │   ├── config.py             # Settings (biến môi trường .env)
│   │   └── security.py           # Hashing bcrypt & JWT handler
│   │
│   ├── database/                 # Kết nối CSDL
│   │   └── session.py            # SQLAlchemy Engine, SessionLocal, Base
│   │
│   ├── schemas/                  # Pydantic Schemas (Request / Response DTOs)
│   │   ├── common.py             # ResponseBase, phân trang
│   │   ├── admin/                # Schemas cho Admin
│   │   └── client/               # Schemas cho Client
│   │
│   └── services/                 # Business Logic & Truy vấn DB
│       ├── admin/                # Nghiệp vụ Admin (Product, Order, Employee, Stats)
│       └── client/               # Nghiệp vụ Client (Product, Cart, Order)
│
├── main.py                       # File chạy chính FastAPI (Cổng 5000)
├── requirements.txt              # Danh sách thư viện Python
├── Dockerfile                    # Dockerfile build image Python
├── .dockerignore                 # File bỏ qua khi Docker build
├── .env.example                  # Mẫu biến môi trường
└── README.md                     # Tài liệu này
```

---

## 🚀 Hướng dẫn khởi chạy

### Cách 1: Chạy trực tiếp (Local Development)
1. **Tạo và kích hoạt môi trường ảo (Virtualenv):**
   ```bash
   cd web/backend
   python -m venv venv
   # Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   # Linux/macOS:
   source venv/bin/activate
   ```

2. **Cài đặt thư viện** (kèm package ORM models dùng chung ở `common/`):
   ```bash
   pip install -r requirements.txt
   pip install -e ../../common
   ```

3. **Cấu hình file `.env`** (bắt buộc: `DB_PASSWORD`, `SECRET_KEY`, `INTERNAL_API_KEY` không có giá trị mặc định):
   ```bash
   cp .env.example .env
   # Điền mật khẩu DB và khóa bí mật (giống với mobile/backend và realtime)
   ```

4. **Khởi chạy Server:**
   ```bash
   python main.py
   # hoặc
   uvicorn main:app --host 0.0.0.0 --port 5000 --reload
   ```

5. **Truy cập:**
   - Cổng chạy: `http://localhost:5000`
   - Swagger UI tương tác: `http://localhost:5000/docs`
   - Redoc documentation: `http://localhost:5000/redoc`

---

### Cách 2: Chạy bằng Docker
Từ thư mục gốc dự án:
```bash
docker-compose up -d web_backend
```

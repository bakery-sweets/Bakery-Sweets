# 🚀 Mobile Backend — Python FastAPI

## Công nghệ
- **Framework:** FastAPI 0.115
- **ORM:** SQLAlchemy 2.0
- **Database:** MySQL 8.0 (dùng chung với Web Backend)
- **Auth:** JWT (python-jose + passlib)
- **Server:** Uvicorn

## Cổng chạy
- **Development:** http://localhost:8000
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## Khởi tạo local
```bash
python -m venv venv
venv\Scripts\activate       # Windows
source venv/bin/activate    # Linux/Mac
pip install -r requirements.txt
```

## Chạy local
```bash
uvicorn main:app --reload --port 8000
```

## Chạy bằng Docker
```bash
docker-compose up mobile_backend
```

## Cấu trúc thư mục đề xuất
```
mobile/backend/
├── main.py              # Entry point FastAPI
├── requirements.txt
├── Dockerfile
├── .env                 # Biến môi trường (DB, JWT secret...)
├── app/
│   ├── core/            # config.py (settings, JWT secret), security.py (hash mật khẩu, JWT)
│   ├── config/          # Kết nối DB (engine, session)
│   ├── models/          # SQLAlchemy models (ánh xạ bảng DB)
│   ├── schemas/         # Pydantic schemas (request/response)
│   ├── api/
│   │   ├── deps.py      # Dependency: get_db, get_current_user, get_current_customer, require_staff
│   │   └── v1/endpoints/  # API routes (auth, products, cart, orders...) — chỉ nhận request & gọi service
│   ├── services/        # Business logic (AuthService, OrderService, PromotionService...)
│   └── websocket/       # Quản lý kết nối WebSocket realtime
```

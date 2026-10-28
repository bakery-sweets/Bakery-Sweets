# Bakery-Sweets

Hệ thống bán bánh The Sweets: website (khách hàng + quản trị) và ứng dụng di động.

## Kiến trúc: Client–Server nhiều tầng

```text
 Tầng trình bày (Client)        Tầng ứng dụng (Server)                     Tầng dữ liệu
┌──────────────────────┐ HTTP  ┌──────────────────────────┐
│ Web React  :3000     │──────▶│ web_backend    :5000     │──┐
│ (Admin + Storefront) │       │ FastAPI /api/admin,client│  │
└──────────┬───────────┘       └────────────┬─────────────┘  │
           │                                │ sự kiện        │  SQL   ┌──────────────┐
           │ WebSocket         ┌────────────▼─────────────┐  ├───────▶│ MariaDB      │
           ├──────────────────▶│ realtime       :8001     │──┤        │ :3308        │
           │                   │ WebSocket /ws            │  │        └──────────────┘
┌──────────┴───────────┐       └────────────▲─────────────┘  │
│ App Flutter          │ HTTP  ┌────────────┴─────────────┐  │
│ (thiết bị di động)   │──────▶│ mobile_backend :8000     │──┘
└──────────────────────┘       │ FastAPI /api/v1          │
                               └──────────────────────────┘
```

| Thư mục | Vai trò | Công nghệ |
| :--- | :--- | :--- |
| `web/frontend` | Client web: trang khách hàng & trang quản trị | React + Vite |
| `mobile/frontend` | Client di động | Flutter |
| `web/backend` | Server API cho web | FastAPI |
| `mobile/backend` | Server API cho app | FastAPI |
| `realtime` | Server WebSocket đẩy sự kiện (đơn hàng, tồn kho, khóa tài khoản) tới cả web và app | FastAPI WebSocket |
| `common` | ORM models dùng chung cho 3 server Python (`thesweets_common.models`) | SQLAlchemy |
| `gateway` | Nginx: cổng vào duy nhất cho App khi qua ngrok | Nginx |
| `database` | Script tạo bảng, dữ liệu mẫu, migration | MariaDB |

- Client chỉ giao tiếp với server qua HTTP/WebSocket, không truy cập CSDL trực tiếp.
- Hai backend gửi sự kiện sang `realtime` qua API nội bộ `POST /internal/events` (khóa `INTERNAL_API_KEY`); client mở WebSocket tới `realtime` kèm JWT.
- Mỗi backend chia 3 lớp: `api/` (router, xác thực) → `services/` (nghiệp vụ) → `database/` + ORM models dùng chung ở `common/`. Router không truy vấn CSDL trực tiếp; service không phụ thuộc FastAPI mà ném lỗi trong `app/core/exceptions.py`, `app/api/errors.py` chuyển chúng thành mã HTTP.

Muốn biết một chức năng đi qua những file nào: xem [docs/LUONG-XU-LY-CHUC-NANG.md](docs/LUONG-XU-LY-CHUC-NANG.md).

## Chạy bằng Docker

```bash
cp .env.example .env      # điền mật khẩu DB và khóa bí mật (file .env không đưa lên git)
docker compose up --build
```

Chạy từng server ngoài Docker: mỗi thư mục `web/backend`, `mobile/backend`, `realtime` có `.env.example` riêng, và cần `pip install -e <đường dẫn tới common>`.

| Dịch vụ | Địa chỉ |
| :--- | :--- |
| Web | http://localhost:3000 |
| Web API | http://localhost:5000/docs |
| Mobile API | http://localhost:8000/docs |
| Realtime | ws://localhost:8001/ws |
| Gateway cho App (ngrok trỏ vào đây) | http://localhost:8080 |
| MariaDB | localhost:3308 |

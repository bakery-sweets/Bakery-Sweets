# Realtime Server — Python FastAPI WebSocket

Server WebSocket dùng chung cho Web React và App Flutter. Web Backend và Mobile Backend không giữ kết nối WebSocket; khi có sự kiện, chúng gọi API nội bộ của server này để phát tới client.

## Cổng chạy
- **WebSocket:** ws://localhost:8001/ws (`?token=<JWT>` để nhận sự kiện riêng của tài khoản)
- **Health:** http://localhost:8001/health

## Chạy local
```bash
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt
pip install -e ../common      # ORM models dùng chung
cp .env.example .env          # điền DB_PASSWORD, SECRET_KEY, INTERNAL_API_KEY
uvicorn main:app --reload --port 8001
```

## Cấu trúc
```text
realtime/
├── main.py
└── app/
    ├── api/
    │   ├── websocket.py   # GET /ws — client kết nối
    │   └── internal.py    # POST /internal/events — backend gửi sự kiện (header X-Internal-Key)
    ├── services/
    │   ├── connection_manager.py  # Quản lý kết nối, phát tới user / staff / all, đóng kết nối khi khóa tài khoản
    │   └── identity_service.py    # Giải mã JWT, đọc bảng users (model User dùng chung) để biết số điện thoại & quyền staff
    ├── schemas/event.py   # RealtimeEventIn
    ├── database/session.py
    └── core/              # config.py, security.py
```

## Định dạng sự kiện nội bộ
```json
{ "target": "user | staff | all", "phone": "09xxxxxxxx", "event": "order_status_updated", "data": {}, "disconnect": false }
```
Client nhận `{"event": "<tên>", ...data}`. `disconnect: true` gửi sự kiện rồi đóng kết nối với mã `4403` (tài khoản bị khóa).

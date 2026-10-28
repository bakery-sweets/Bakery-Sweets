# 📱 Mobile Frontend — Flutter

## Công nghệ
- **Framework:** Flutter 3.x
- **Language:** Dart
- **State Management:** Riverpod / BLoC
- **HTTP Client:** Dio
- **API Backend:** http://localhost:8000

## Cổng API
- **Mobile Backend (FastAPI):** http://localhost:8000
- **Realtime Server (WebSocket):** ws://localhost:8001/ws
- **Gateway cho ngrok:** http://localhost:8080 (`/ws` → Realtime, còn lại → Mobile Backend). Chạy `ngrok http --url=<domain> 8080` và đặt `BASE_URL` trong `env.json`; app tự dùng `wss://<domain>/ws` cho realtime.

## Khởi tạo project
```bash
flutter create . --org com.thesweets --project-name thesweets_mobile
flutter pub add dio riverpod flutter_riverpod go_router
```

## Chạy
```bash
flutter run
```

> ⚠️ Flutter chạy trực tiếp trên thiết bị/emulator, không cần Docker.

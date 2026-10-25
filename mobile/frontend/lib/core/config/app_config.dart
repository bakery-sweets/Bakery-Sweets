import 'dart:io';
import 'package:flutter/foundation.dart';

class AppConfig {
  /// URL công khai tùy chỉnh (ví dụ ngrok: https://xxxx.ngrok-free.app).
  /// Có thể cấu hình trong env.json cục bộ (đã ignore trên git).
  static const String customBaseUrl = String.fromEnvironment('BASE_URL', defaultValue: '');

  /// Host của Backend khi chạy nội bộ LAN hoặc Android Emulator.
  static const String serverHost = String.fromEnvironment('SERVER_HOST', defaultValue: '192.168.1.210');
  static const int serverPort = 8000;

  static String get baseUrl {
    // 1. Ưu tiên ngrok / URL tuỳ chỉnh nếu được khai báo
    if (customBaseUrl.trim().isNotEmpty) {
      final clean = customBaseUrl.trim();
      return clean.endsWith('/') ? clean.substring(0, clean.length - 1) : clean;
    }
    // 2. Chạy trên trình duyệt Web
    if (kIsWeb) return 'http://localhost:$serverPort';
    // 3. Chạy trên Mobile Android / iOS
    try {
      if (Platform.isAndroid || Platform.isIOS) {
        return 'http://$serverHost:$serverPort';
      }
    } catch (_) {}
    return 'http://localhost:$serverPort';
  }

  static const String apiVersion = '/api/v1';
  static String get apiUrl => '$baseUrl$apiVersion';

  // Timeout (5s giúp nhận diện mất kết nối mạng nhanh chóng)
  static const int connectTimeout = 5000;
  static const int receiveTimeout = 10000;

  // App info
  static const String appName = 'The Sweets';
  static const String appVersion = '1.0.0';

  // WebSocket URLs
  static String get wsBaseUrl {
    return baseUrl.replaceFirst('http://', 'ws://').replaceFirst('https://', 'wss://');
  }

  // Kênh realtime dùng chung với Web (gửi kèm ?token=<JWT> để nhận sự kiện riêng của tài khoản)
  static String get wsRealtimeUrl => '$wsBaseUrl$apiVersion/ws';
}

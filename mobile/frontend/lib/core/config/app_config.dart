import 'dart:io';
import 'package:flutter/foundation.dart';

class AppConfig {
  /// URL công khai tùy chỉnh (ví dụ ngrok trỏ vào mobile_gateway cổng 8080: https://xxxx.ngrok-free.app).
  /// Có thể cấu hình trong env.json cục bộ (đã ignore trên git).
  static const String customBaseUrl = String.fromEnvironment('BASE_URL', defaultValue: '');

  /// URL Realtime Server tùy chỉnh; bỏ trống thì dùng `<BASE_URL>/ws` (gateway chuyển tiếp sang Realtime Server).
  static const String customRealtimeUrl = String.fromEnvironment('REALTIME_URL', defaultValue: '');

  /// Host của Backend khi chạy nội bộ LAN hoặc Android Emulator.
  static const String serverHost = String.fromEnvironment('SERVER_HOST', defaultValue: '192.168.1.210');
  static const int serverPort = 8000;
  static const int realtimePort = 8001;

  /// Host máy chủ khi không khai báo URL tùy chỉnh
  static String get _localHost {
    // Chạy trên trình duyệt Web
    if (kIsWeb) return 'localhost';
    // Chạy trên Mobile Android / iOS
    try {
      if (Platform.isAndroid || Platform.isIOS) return serverHost;
    } catch (_) {}
    return 'localhost';
  }

  static String get baseUrl {
    // Ưu tiên ngrok / URL tùy chỉnh nếu được khai báo
    if (customBaseUrl.trim().isNotEmpty) {
      final clean = customBaseUrl.trim();
      return clean.endsWith('/') ? clean.substring(0, clean.length - 1) : clean;
    }
    return 'http://$_localHost:$serverPort';
  }

  static const String apiVersion = '/api/v1';
  static String get apiUrl => '$baseUrl$apiVersion';

  // Timeout (5s giúp nhận diện mất kết nối mạng nhanh chóng)
  static const int connectTimeout = 5000;
  static const int receiveTimeout = 10000;

  // App info
  static const String appName = 'The Sweets';
  static const String appVersion = '1.0.0';

  // Kênh realtime ở Realtime Server riêng, dùng chung với Web (gửi kèm ?token=<JWT> để nhận sự kiện riêng của tài khoản)
  static String get wsRealtimeUrl {
    if (customRealtimeUrl.trim().isNotEmpty) return customRealtimeUrl.trim();
    if (customBaseUrl.trim().isNotEmpty) {
      return '${baseUrl.replaceFirst('http://', 'ws://').replaceFirst('https://', 'wss://')}/ws';
    }
    return 'ws://$_localHost:$realtimePort/ws';
  }
}

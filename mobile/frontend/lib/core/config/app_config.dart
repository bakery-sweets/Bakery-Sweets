import 'dart:io';
import 'package:flutter/foundation.dart';

class AppConfig {
  /// Host của Backend khi chạy trên Android/iOS.
  /// Mặc định `10.0.2.2` = máy tính host khi chạy trên Android Emulator (không phụ thuộc mạng Wi-Fi/4G).
  /// Chạy trên điện thoại thật: truyền IP LAN của máy tính, ví dụ
  /// `flutter run --dart-define=SERVER_HOST=10.78.16.22`
  static const String serverHost = String.fromEnvironment('SERVER_HOST', defaultValue: '10.0.2.2');
  static const int serverPort = 8000;

  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:$serverPort';
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

  static String wsNotificationUrl(String userName) => '$wsBaseUrl$apiVersion/ws/notifications/$userName';
  static String wsOrderTrackingUrl(int orderId) => '$wsBaseUrl$apiVersion/ws/orders/$orderId';
}

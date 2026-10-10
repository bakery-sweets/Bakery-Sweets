import 'dart:io';
import 'package:flutter/foundation.dart';

class AppConfig {
  /// Địa chỉ IP mạng LAN của máy tính chạy Docker Backend (Wi-Fi hiện tại)
  /// Giúp cả điện thoại thật (khi kết nối chung Wi-Fi) và máy ảo đều nhận dữ liệu trực tiếp.
  static const String serverHost = '192.168.1.2';
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

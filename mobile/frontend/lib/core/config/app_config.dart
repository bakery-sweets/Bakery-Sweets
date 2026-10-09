import 'dart:io';
import 'package:flutter/foundation.dart';

class AppConfig {
  // Tự động nhận diện nền tảng: Android Emulator dùng 10.0.2.2, Windows/Web dùng localhost
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:8000';
    try {
      if (Platform.isAndroid) return 'http://10.0.2.2:8000';
    } catch (_) {}
    return 'http://localhost:8000';
  }

  static const String apiVersion = '/api/v1';
  static String get apiUrl => '$baseUrl$apiVersion';

  // Timeout
  static const int connectTimeout = 10000; // 10 giây
  static const int receiveTimeout = 15000; // 15 giây

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

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/app_config.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio _dio;
  final _storage = const FlutterSecureStorage();

  ApiClient._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: const Duration(milliseconds: AppConfig.connectTimeout),
      receiveTimeout: const Duration(milliseconds: AppConfig.receiveTimeout),
      headers: {'Content-Type': 'application/json'},
    ));

    // Interceptor: chuẩn hóa URL & tự động gắn JWT token vào mỗi request
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Tự động gắn tiền tố /api/v1 nếu đường dẫn chưa có và không phải URL tuyệt đối
        if (!options.path.startsWith('/api/v1') &&
            !options.path.startsWith('http://') &&
            !options.path.startsWith('https://')) {
          final cleanPath = options.path.startsWith('/') ? options.path : '/${options.path}';
          options.path = '${AppConfig.apiVersion}$cleanPath';
        }

        final token = await _storage.read(key: 'access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        if (kDebugMode) {
          debugPrint('[API Request] ${options.method} ${options.baseUrl}${options.path}');
        }
        return handler.next(options);
      },
      onResponse: (response, handler) {
        if (kDebugMode) {
          debugPrint('[API Response] ${response.statusCode} ${response.requestOptions.path}');
        }
        return handler.next(response);
      },
      onError: (error, handler) async {
        if (kDebugMode) {
          debugPrint('[API Error] ${error.response?.statusCode} ${error.requestOptions.path}: ${error.message}');
        }
        // Token hết hạn (401) → tự động đăng xuất
        if (error.response?.statusCode == 401) {
          await _storage.deleteAll();
        }
        return handler.next(error);
      },
    ));
  }

  Dio get dio => _dio;
}

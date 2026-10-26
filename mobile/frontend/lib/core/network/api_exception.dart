import 'package:dio/dio.dart';

/// Lỗi gọi API, [message] đã sẵn sàng hiển thị thẳng cho người dùng
class ApiException implements Exception {
  final String message;
  const ApiException(this.message);

  /// Lấy câu báo lỗi server trả về (trường `detail` của FastAPI), không có thì dùng [fallback]
  factory ApiException.from(Object error, String fallback) {
    if (error is ApiException) return error;
    if (error is DioException) {
      final data = error.response?.data;
      final detail = data is Map ? data['detail'] : null;
      if (detail is String && detail.trim().isNotEmpty) return ApiException(detail);
    }
    return ApiException(fallback);
  }

  @override
  String toString() => message;
}

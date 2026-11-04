import 'package:dio/dio.dart';

/// Lỗi gọi API, [message] đã sẵn sàng hiển thị thẳng cho người dùng
class ApiException implements Exception {
  final String message;

  /// Mã lỗi nghiệp vụ server gửi kèm (trường `code`), VD: `OUT_OF_STOCK`
  final String? code;
  const ApiException(this.message, {this.code});

  /// Bánh không còn đủ trong kho (thường do khách khác vừa mua trước) — không phải lỗi hệ thống
  bool get isOutOfStock => code == 'OUT_OF_STOCK';

  /// Lấy câu báo lỗi server trả về (trường `detail` của FastAPI), không có thì dùng [fallback]
  factory ApiException.from(Object error, String fallback) {
    if (error is ApiException) return error;
    if (error is DioException) {
      final data = error.response?.data;
      final detail = data is Map ? data['detail'] : null;
      final code = data is Map && data['code'] is String ? data['code'] as String : null;
      if (detail is String && detail.trim().isNotEmpty) return ApiException(detail, code: code);
    }
    return ApiException(fallback);
  }

  @override
  String toString() => message;
}

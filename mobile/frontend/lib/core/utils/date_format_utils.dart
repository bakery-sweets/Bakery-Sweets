import 'package:intl/intl.dart';

class AppDateFormat {
  static final DateFormat _dateTimeFormat = DateFormat('dd/MM/yyyy HH:mm');
  static final DateFormat _dateFormat = DateFormat('dd/MM/yyyy');
  static final DateFormat _shortFormat = DateFormat('HH:mm dd/MM');

  /// Định dạng ngày giờ đầy đủ (VD: 24/10/2026 19:30)
  static String dateTime(dynamic value, {String? pattern}) =>
      _format(value, pattern != null ? DateFormat(pattern) : _dateTimeFormat);

  /// Định dạng ngày giờ ngắn gọn (VD: 19:30 24/10)
  static String short(dynamic value) => _format(value, _shortFormat);

  /// Định dạng ngày tháng năm (VD: 24/10/2026)
  static String date(dynamic value) => _format(value, _dateFormat);

  /// Nhận DateTime hoặc chuỗi ISO từ API, đổi về giờ máy rồi định dạng; không đọc được thì trả nguyên văn
  static String _format(dynamic value, DateFormat format) {
    if (value == null) return '';
    try {
      DateTime dt;
      if (value is DateTime) {
        dt = value;
      } else if (value is String) {
        final trimmed = value.trim();
        if (trimmed.isEmpty) return '';
        dt = DateTime.parse(trimmed);
      } else {
        return '';
      }
      return format.format(dt.isUtc ? dt.toLocal() : dt);
    } catch (_) {
      return value.toString();
    }
  }
}

import 'package:intl/intl.dart';

class AppDateFormat {
  static final DateFormat _dateTimeFormat = DateFormat('dd/MM/yyyy HH:mm');
  static final DateFormat _dateFormat = DateFormat('dd/MM/yyyy');
  static final DateFormat _shortFormat = DateFormat('HH:mm dd/MM');

  /// Định dạng ngày giờ đầy đủ (VD: 24/10/2026 19:30)
  static String dateTime(dynamic value, {String? pattern}) {
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
      final local = dt.isUtc ? dt.toLocal() : dt;
      if (pattern != null) {
        return DateFormat(pattern).format(local);
      }
      return _dateTimeFormat.format(local);
    } catch (_) {
      return value.toString();
    }
  }

  /// Định dạng ngày giờ ngắn gọn (VD: 19:30 24/10)
  static String short(dynamic value) {
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
      final local = dt.isUtc ? dt.toLocal() : dt;
      return _shortFormat.format(local);
    } catch (_) {
      return value.toString();
    }
  }

  /// Định dạng ngày tháng năm (VD: 24/10/2026)
  static String date(dynamic value) {
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
      final local = dt.isUtc ? dt.toLocal() : dt;
      return _dateFormat.format(local);
    } catch (_) {
      return value.toString();
    }
  }
}

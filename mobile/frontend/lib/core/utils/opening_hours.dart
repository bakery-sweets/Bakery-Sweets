/// Giờ mở cửa của tiệm (đồng bộ với Web và Backend): giờ lấy bánh phải nằm trong khoảng này
class OpeningHours {
  static const int openHour = 7;
  static const int openMinute = 30;
  static const int closeHour = 21;
  static const int closeMinute = 30;
  static const String label = '07:30 - 21:30';

  /// Giờ mở cửa của ngày [day]
  static DateTime openOn(DateTime day) => DateTime(day.year, day.month, day.day, openHour, openMinute);

  /// Giờ đóng cửa của ngày [day]
  static DateTime closeOn(DateTime day) => DateTime(day.year, day.month, day.day, closeHour, closeMinute);

  /// [time] có nằm trong giờ mở cửa không
  static bool isWithin(DateTime time) => !time.isBefore(openOn(time)) && !time.isAfter(closeOn(time));

  /// Thời điểm hợp lệ gần nhất tính từ [time]: trước giờ mở thì lùi tới giờ mở,
  /// sau giờ đóng thì chuyển sang giờ mở cửa ngày hôm sau
  static DateTime nextValid(DateTime time) {
    if (time.isBefore(openOn(time))) return openOn(time);
    if (time.isAfter(closeOn(time))) return openOn(time.add(const Duration(days: 1)));
    return time;
  }

  /// Câu báo lỗi nếu [pickup] không hợp lệ (ở quá khứ hoặc ngoài giờ mở cửa), hợp lệ thì trả null
  static String? validatePickup(DateTime pickup, {DateTime? now}) {
    final current = now ?? DateTime.now();
    if (pickup.isBefore(current)) return 'Giờ lấy bánh phải ở thời điểm sau hiện tại';
    if (!isWithin(pickup)) return 'Giờ lấy bánh phải trong giờ mở cửa của tiệm ($label)';
    return null;
  }
}

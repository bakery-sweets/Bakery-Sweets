/// Đọc số thực từ JSON: backend trả Decimal dạng chuỗi ("130000.00") hoặc dạng số
double? parseDoubleOrNull(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString());
}

double parseDouble(dynamic value) => parseDoubleOrNull(value) ?? 0.0;

import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

/// Thông tin hiển thị của một trạng thái đơn hàng (nhãn, màu, icon, mô tả)
class OrderStatusInfo {
  final String key;
  final String label;
  final String description;
  final IconData icon;
  final Color color;
  final Color background;

  const OrderStatusInfo({
    required this.key,
    required this.label,
    required this.description,
    required this.icon,
    required this.color,
    required this.background,
  });
}

class OrderStatus {
  static const pending = OrderStatusInfo(
    key: 'pending',
    label: 'Chờ xác nhận',
    description: 'Tiệm đã nhận đơn và sẽ xác nhận trong ít phút.',
    icon: Icons.hourglass_top_rounded,
    color: Color(0xFFD97706),
    background: Color(0xFFFEF3C7),
  );
  static const processing = OrderStatusInfo(
    key: 'processing',
    label: 'Đang làm bánh',
    description: 'Thợ bánh đang chuẩn bị đơn hàng của bạn.',
    icon: Icons.soup_kitchen_outlined,
    color: Color(0xFF1D4ED8),
    background: Color(0xFFDBEAFE),
  );
  static const ready = OrderStatusInfo(
    key: 'ready',
    label: 'Sẵn sàng nhận',
    description: 'Bánh đã xong, mời bạn ghé tiệm nhận bánh.',
    icon: Icons.storefront_outlined,
    color: Color(0xFF047857),
    background: Color(0xFFD1FAE5),
  );
  static const completed = OrderStatusInfo(
    key: 'completed',
    label: 'Đã nhận bánh',
    description: 'Cảm ơn bạn đã ủng hộ The Sweets!',
    icon: Icons.check_circle_outline_rounded,
    color: Color(0xFF475569),
    background: Color(0xFFF1F5F9),
  );
  static const cancelled = OrderStatusInfo(
    key: 'cancelled',
    label: 'Đã hủy',
    description: 'Đơn hàng đã bị hủy.',
    icon: Icons.cancel_outlined,
    color: Color(0xFFDC2626),
    background: Color(0xFFFEE2E2),
  );

  /// Thứ tự các bước của một đơn bình thường (dùng cho thanh tiến trình)
  static const flow = [pending, processing, ready, completed];

  /// Các tab trạng thái ở màn Lịch sử đơn hàng (sau tab "Tất cả")
  static const tabs = [pending, processing, ready, completed, cancelled];

  static OrderStatusInfo of(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return pending;
      case 'processing':
        return processing;
      case 'ready':
        return ready;
      case 'completed':
        return completed;
      case 'cancelled':
        return cancelled;
      default:
        return OrderStatusInfo(
          key: status.toLowerCase(),
          label: status,
          description: '',
          icon: Icons.receipt_long_outlined,
          color: AppColors.textSecondary,
          background: AppColors.surfaceVariant,
        );
    }
  }
}

/// Nhãn trạng thái thanh toán
String paymentStatusLabel(String status) {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'Đã thanh toán';
    case 'refunded':
      return 'Đã hoàn tiền';
    default:
      return 'Chưa thanh toán';
  }
}

/// Nhãn hình thức thanh toán
String paymentMethodLabel(String method) {
  switch (method.toLowerCase()) {
    case 'banking':
      return 'Chuyển khoản ngân hàng';
    case 'cod':
      return 'Tiền mặt khi nhận bánh';
    default:
      return method;
  }
}

/// Badge nhỏ hiển thị trạng thái đơn
class OrderStatusBadge extends StatelessWidget {
  final String status;
  const OrderStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final info = OrderStatus.of(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: info.background,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        info.label,
        style: TextStyle(color: info.color, fontSize: 11.5, fontWeight: FontWeight.w700),
      ),
    );
  }
}

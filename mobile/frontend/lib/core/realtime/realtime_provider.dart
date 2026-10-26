import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../network/websocket_service.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/cart/providers/cart_provider.dart';
import '../../features/notifications/providers/notifications_provider.dart';
import '../../features/orders/providers/orders_provider.dart';
import '../../features/products/providers/product_provider.dart';

/// Kết nối realtime chung của app (dùng chung trung tâm với Web):
/// - Luôn kết nối để khách vãng lai cũng thấy tồn kho / sản phẩm thay đổi
/// - Đăng nhập / đăng xuất thì kết nối lại bằng token mới để nhận sự kiện riêng của tài khoản
/// - Phân phối từng sự kiện tới provider tương ứng
final realtimeProvider = Provider<void>((ref) {
  const storage = FlutterSecureStorage();

  Future<void> reconnect() async {
    final isLoggedIn = ref.read(authProvider).isAuthenticated;
    final token = isLoggedIn ? await storage.read(key: 'access_token') : null;
    WebSocketService().connect(token: token);
  }

  ref.listen(authProvider, (prev, next) {
    if (prev?.isAuthenticated != next.isAuthenticated) reconnect();
  });

  final subscription = WebSocketService().messageStream.listen((data) {
    if (kDebugMode) {
      debugPrint('[Realtime] ${data['event']}');
    }
    _dispatch(ref, data);
  });

  reconnect();

  ref.onDispose(() {
    subscription.cancel();
    WebSocketService().disconnect();
  });
});

void _dispatch(Ref ref, Map<String, dynamic> data) {
  switch (data['event']) {
    // Đặt đơn thành công / nhân viên đổi trạng thái đơn: hiện thông báo và tải lại đơn hàng
    case 'new_notification':
    case 'order_status_updated':
      ref.read(notificationsProvider.notifier).onRealtimeNotification(data);

    // Đơn đổi thông tin không cần báo (VD: xác nhận thanh toán): chỉ tải lại danh sách
    case 'order_updated':
      ref.read(ordersProvider.notifier).fetchOrders();

    // Giỏ hàng vừa đổi trên Web hoặc thiết bị khác
    case 'cart_updated':
      ref.read(cartProvider.notifier).fetchCart();

    // Có người đặt / hủy đơn, admin nhập hàng: tồn kho đổi
    case 'stock_updated':
      ref.invalidate(productsProvider);
      ref.read(cartProvider.notifier).applyStock(data['items'] as List<dynamic>? ?? const []);

    // Admin thêm / sửa / ngừng bán sản phẩm
    case 'products_changed':
      ref.invalidate(productsProvider);

    // Admin khóa tài khoản: đăng xuất ngay, giao diện hiện lý do
    case 'account_locked':
      ref.read(authProvider.notifier).forceLogout(data['reason'] as String?);
  }
}

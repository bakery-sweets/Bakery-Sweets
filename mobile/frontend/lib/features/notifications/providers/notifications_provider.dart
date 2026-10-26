import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../auth/providers/auth_provider.dart';
import '../../orders/providers/orders_provider.dart';
import '../models/notification_model.dart';

class NotificationsState {
  final bool isLoading;
  final List<NotificationModel> notifications;
  final String? lastRealtimeAlert;

  const NotificationsState({
    this.isLoading = false,
    this.notifications = const [],
    this.lastRealtimeAlert,
  });

  int get unreadCount => notifications.where((n) => !n.isRead).length;

  NotificationsState copyWith({
    bool? isLoading,
    List<NotificationModel>? notifications,
    String? lastRealtimeAlert,
    bool clearAlert = false,
  }) {
    return NotificationsState(
      isLoading: isLoading ?? this.isLoading,
      notifications: notifications ?? this.notifications,
      lastRealtimeAlert: clearAlert ? null : (lastRealtimeAlert ?? this.lastRealtimeAlert),
    );
  }
}

class NotificationsNotifier extends Notifier<NotificationsState> {
  @override
  NotificationsState build() {
    ref.listen(authProvider, (prev, next) {
      if (prev?.user?.userName != next.user?.userName) {
        if (next.isAuthenticated && next.user != null) {
          fetchNotifications();
        } else {
          state = const NotificationsState();
        }
      }
    });

    final auth = ref.read(authProvider);
    if (auth.isAuthenticated && auth.user != null) {
      Future.microtask(() => fetchNotifications());
    }

    return const NotificationsState();
  }

  /// Nhận thông báo realtime (đặt đơn thành công, nhân viên đổi trạng thái đơn):
  /// hiện banner ngay, tải lại danh sách thông báo (lấy đúng id từ server) và đơn hàng
  void onRealtimeNotification(Map<String, dynamic> data) {
    final title = data['title'] as String? ?? 'Thông báo đơn hàng';
    final message = data['message'] as String? ?? '';
    state = state.copyWith(lastRealtimeAlert: '$title: $message');
    fetchNotifications();
    ref.read(ordersProvider.notifier).fetchOrders();
  }

  void clearAlert() {
    state = state.copyWith(clearAlert: true);
  }

  Future<void> fetchNotifications() async {
    final auth = ref.read(authProvider);
    if (!auth.isAuthenticated) return;

    state = state.copyWith(isLoading: true);
    try {
      final response = await ApiClient().dio.get('/notifications');
      if (response.statusCode == 200) {
        final list = response.data as List<dynamic>;
        final notifs = list.map((j) => NotificationModel.fromJson(j as Map<String, dynamic>)).toList();
        state = state.copyWith(notifications: notifs, isLoading: false);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[Notifications Error] $e');
      }
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> markAllAsRead() async {
    try {
      await ApiClient().dio.put('/notifications/read-all');
      final updated = state.notifications.map((n) => n.copyWith(isRead: true)).toList();
      state = state.copyWith(notifications: updated);
    } catch (_) {}
  }

  Future<void> markAsRead(int notificationId) async {
    try {
      await ApiClient().dio.put('/notifications/$notificationId/read');
      final updated = state.notifications.map((n) {
        if (n.notificationId == notificationId) {
          return n.copyWith(isRead: true);
        }
        return n;
      }).toList();
      state = state.copyWith(notifications: updated);
    } catch (_) {}
  }
}

final notificationsProvider = NotifierProvider<NotificationsNotifier, NotificationsState>(
  NotificationsNotifier.new,
);

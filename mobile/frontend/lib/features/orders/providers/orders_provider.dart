import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/order_model.dart';

class OrdersState {
  final bool isLoading;
  final List<OrderModel> orders;
  final String? errorMessage;

  const OrdersState({
    this.isLoading = false,
    this.orders = const [],
    this.errorMessage,
  });

  OrdersState copyWith({
    bool? isLoading,
    List<OrderModel>? orders,
    String? errorMessage,
    bool clearError = false,
  }) {
    return OrdersState(
      isLoading: isLoading ?? this.isLoading,
      orders: orders ?? this.orders,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class OrdersNotifier extends Notifier<OrdersState> {
  @override
  OrdersState build() {
    // Tự động load orders nếu người dùng đã đăng nhập
    Future.microtask(() {
      final auth = ref.read(authProvider);
      if (auth.isAuthenticated) {
        fetchOrders();
      }
    });

    // Lắng nghe trạng thái đăng nhập để cập nhật danh sách đơn hàng
    ref.listen(authProvider, (prev, next) {
      if (prev?.isAuthenticated != next.isAuthenticated) {
        if (next.isAuthenticated) {
          fetchOrders();
        } else {
          state = const OrdersState();
        }
      }
    });

    return const OrdersState();
  }

  Future<void> fetchOrders() async {
    final auth = ref.read(authProvider);
    if (!auth.isAuthenticated) {
      state = state.copyWith(orders: [], isLoading: false, clearError: true);
      return;
    }

    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await ApiClient().dio.get('/orders');
      if (response.statusCode == 200) {
        final list = response.data as List<dynamic>;
        final orders = list.map((json) => OrderModel.fromJson(json as Map<String, dynamic>)).toList();
        state = state.copyWith(orders: orders, isLoading: false, clearError: true);
      } else {
        state = state.copyWith(isLoading: false, errorMessage: 'Không thể tải danh sách đơn hàng');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[Orders Error] $e');
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Lỗi kết nối khi tải đơn hàng');
    }
  }
}

final ordersProvider = NotifierProvider<OrdersNotifier, OrdersState>(OrdersNotifier.new);

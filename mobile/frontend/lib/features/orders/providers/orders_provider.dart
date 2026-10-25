import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../auth/providers/auth_provider.dart';
import '../../cart/providers/cart_provider.dart';
import '../../promotions/providers/promotions_provider.dart';
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

  /// Đặt đơn từ các món đang có trong giỏ; trả về đơn vừa tạo, lỗi thì ném [ApiException]
  Future<OrderModel> placeOrder({
    required String recipientName,
    required String recipientPhone,
    required DateTime pickupTime,
    required String paymentMethod,
    String? notes,
    int? promotionId,
  }) async {
    final cartItems = ref.read(cartProvider);
    if (cartItems.isEmpty) {
      throw const ApiException('Giỏ hàng đang trống');
    }

    try {
      final response = await ApiClient().dio.post('/orders', data: {
        'recipient_name': recipientName,
        'recipient_phone': recipientPhone,
        'pickup_time': pickupTime.toIso8601String(),
        'notes': notes,
        'payment_method': paymentMethod,
        'promotion_id': promotionId,
        'items': [
          for (final item in cartItems)
            {
              'product_id': item.productId,
              'size_id': item.sizeId,
              'quantity': item.quantity,
              'note': null,
            },
        ],
      });
      final order = OrderModel.fromJson(response.data as Map<String, dynamic>);

      // Server đã tự xóa các món vừa đặt khỏi giỏ và tính thêm lượt dùng voucher
      ref.read(cartProvider.notifier).fetchCart();
      ref.invalidate(promotionsProvider);
      fetchOrders();
      return order;
    } catch (e) {
      throw ApiException.from(e, 'Không thể đặt hàng, vui lòng thử lại');
    }
  }
}

final ordersProvider = NotifierProvider<OrdersNotifier, OrdersState>(OrdersNotifier.new);

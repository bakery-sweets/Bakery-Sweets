import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/cart_item_model.dart';
import '../../products/models/product_model.dart';

const _overStockMsg = 'Số lượng bạn chọn đã vượt quá số bánh còn lại trong tiệm.';

// Khi đã đăng nhập, giỏ hàng nằm trên server (bảng cart, dùng chung với Web);
// khách vãng lai giữ giỏ tạm trong app và được đẩy lên server ngay sau khi đăng nhập
class CartNotifier extends Notifier<List<CartItemModel>> {
  @override
  List<CartItemModel> build() {
    // Lắng nghe trạng thái đăng nhập để đồng bộ / dọn giỏ hàng
    ref.listen(authProvider, (prev, next) {
      if (prev?.isAuthenticated == next.isAuthenticated) return;
      if (next.isAuthenticated) {
        syncAfterLogin();
      } else {
        state = [];
      }
    });

    Future.microtask(() {
      if (_isLoggedIn) fetchCart();
    });

    return [];
  }

  bool get _isLoggedIn => ref.read(authProvider).isAuthenticated;

  CartItemModel? _find(int productId, int sizeId) {
    for (final item in state) {
      if (item.productId == productId && item.sizeId == sizeId) return item;
    }
    return null;
  }

  /// Gọi API giỏ hàng, chuyển lỗi của server thành [ApiException]
  Future<void> _request(Future<Response> Function() request) async {
    try {
      await request();
    } catch (e) {
      throw ApiException.from(e, 'Không thể cập nhật giỏ hàng, vui lòng thử lại');
    }
  }

  Future<void> fetchCart() async {
    if (!_isLoggedIn) return;
    try {
      final response = await ApiClient().dio.get('/cart');
      if (response.statusCode == 200) {
        final list = response.data as List<dynamic>;
        state = list.map((j) => CartItemModel.fromJson(j as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[Cart Error] $e');
      }
    }
  }

  /// Đẩy giỏ tạm của khách vãng lai lên server rồi tải lại giỏ đầy đủ (gồm cả món đã thêm từ Web)
  Future<void> syncAfterLogin() async {
    final guestItems = state.where((item) => item.cartId == null).toList();
    for (final item in guestItems) {
      try {
        await ApiClient().dio.post('/cart', data: {
          'product_id': item.productId,
          'size_id': item.sizeId,
          'quantity': item.quantity,
        });
      } catch (e) {
        // Món hết hàng / ngừng bán thì bỏ qua, các món khác vẫn được đồng bộ
        if (kDebugMode) {
          debugPrint('[Cart Sync Error] $e');
        }
      }
    }
    await fetchCart();
  }

  Future<void> addToCart(ProductModel product, ProductSizeModel size, int quantity) async {
    if (_isLoggedIn) {
      await _request(() => ApiClient().dio.post('/cart', data: {
            'product_id': product.productId,
            'size_id': size.sizeId,
            'quantity': quantity,
          }));
      await fetchCart();
      return;
    }

    final existing = _find(product.productId, size.sizeId);
    if ((existing?.quantity ?? 0) + quantity > size.stockQuantity) {
      throw const ApiException(_overStockMsg);
    }

    if (existing != null) {
      state = [
        for (final item in state)
          if (identical(item, existing))
            item.copyWith(quantity: item.quantity + quantity, stockQuantity: size.stockQuantity)
          else
            item,
      ];
    } else {
      state = [
        ...state,
        CartItemModel(
          productId: product.productId,
          productName: product.productName,
          image: product.image,
          sizeId: size.sizeId,
          sizeName: size.sizeName,
          price: size.price,
          quantity: quantity,
          stockQuantity: size.stockQuantity,
        ),
      ];
    }
  }

  Future<void> updateQty(int productId, int sizeId, int quantity) async {
    final target = _find(productId, sizeId);
    if (target == null) return;

    final qty = quantity < 1 ? 1 : quantity;
    // Chỉ chặn khi tăng, giảm số lượng thì luôn cho phép
    final stock = target.stockQuantity;
    if (stock != null && qty > target.quantity && qty > stock) {
      throw const ApiException(_overStockMsg);
    }

    // Cập nhật giao diện ngay, nếu server từ chối thì tải lại giỏ từ server
    state = [
      for (final item in state)
        if (identical(item, target)) item.copyWith(quantity: qty) else item,
    ];

    if (_isLoggedIn && target.cartId != null) {
      try {
        await _request(() => ApiClient().dio.put('/cart/${target.cartId}', data: {'quantity': qty}));
      } catch (_) {
        await fetchCart();
        rethrow;
      }
    }
  }

  Future<void> incrementQty(int productId, int sizeId) async {
    final item = _find(productId, sizeId);
    if (item == null) return;
    await updateQty(productId, sizeId, item.quantity + 1);
  }

  Future<void> decrementQty(int productId, int sizeId) async {
    final item = _find(productId, sizeId);
    if (item == null) return;
    if (item.quantity <= 1) {
      await removeItem(productId, sizeId);
    } else {
      await updateQty(productId, sizeId, item.quantity - 1);
    }
  }

  Future<void> removeItem(int productId, int sizeId) async {
    final target = _find(productId, sizeId);
    if (target == null) return;

    state = state.where((item) => !identical(item, target)).toList();

    if (_isLoggedIn && target.cartId != null) {
      try {
        await _request(() => ApiClient().dio.delete('/cart/${target.cartId}'));
      } catch (_) {
        await fetchCart();
        rethrow;
      }
    }
  }

  /// Cập nhật tồn kho realtime cho các món đang nằm trong giỏ (sự kiện stock_updated)
  void applyStock(List<dynamic> stockItems) {
    final stockByKey = {
      for (final s in stockItems.whereType<Map<String, dynamic>>())
        '${s['product_id']}-${s['size_id']}': s['stock_quantity'] as int?,
    };
    if (state.isEmpty || stockByKey.isEmpty) return;
    state = [
      for (final item in state)
        if (stockByKey.containsKey('${item.productId}-${item.sizeId}'))
          item.copyWith(stockQuantity: stockByKey['${item.productId}-${item.sizeId}'])
        else
          item,
    ];
  }

  Future<void> clearCart() async {
    if (_isLoggedIn) {
      await _request(() => ApiClient().dio.delete('/cart'));
    }
    state = [];
  }
}

// Provider quản lý state danh sách giỏ hàng theo chuẩn Riverpod 3
final cartProvider = NotifierProvider<CartNotifier, List<CartItemModel>>(CartNotifier.new);

// Provider tính tổng tiền trong giỏ
final cartTotalProvider = Provider<double>((ref) {
  final cart = ref.watch(cartProvider);
  return cart.fold(0.0, (sum, item) => sum + item.subtotal);
});

// Provider tính tổng số lượng món bánh trong giỏ (dùng cho badge trên Navbar & Icon)
final cartCountProvider = Provider<int>((ref) {
  final cart = ref.watch(cartProvider);
  return cart.fold(0, (sum, item) => sum + item.quantity);
});

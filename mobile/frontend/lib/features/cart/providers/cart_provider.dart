import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/cart_item_model.dart';
import '../../products/models/product_model.dart';

class CartNotifier extends Notifier<List<CartItemModel>> {
  @override
  List<CartItemModel> build() {
    return [
      // Một sản phẩm mẫu ban đầu để user thấy giỏ hàng đẹp mắt ngay
      const CartItemModel(
        productId: 1,
        productName: 'Chocolate Mousse',
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop',
        sizeId: 1,
        sizeName: 'Size S (16cm)',
        price: 120000,
        quantity: 1,
      ),
    ];
  }

  void addToCart(ProductModel product, ProductSizeModel size, int quantity) {
    final existingIndex = state.indexWhere(
      (item) => item.productId == product.productId && item.sizeId == size.sizeId,
    );

    if (existingIndex != -1) {
      final existing = state[existingIndex];
      final updated = existing.copyWith(quantity: existing.quantity + quantity);
      final newList = List<CartItemModel>.from(state);
      newList[existingIndex] = updated;
      state = newList;
    } else {
      final newItem = CartItemModel(
        productId: product.productId,
        productName: product.productName,
        image: product.image,
        sizeId: size.sizeId,
        sizeName: size.sizeName,
        price: size.price,
        quantity: quantity,
      );
      state = [...state, newItem];
    }
  }

  void incrementQty(int productId, int sizeId) {
    state = [
      for (final item in state)
        if (item.productId == productId && item.sizeId == sizeId)
          item.copyWith(quantity: item.quantity + 1)
        else
          item,
    ];
  }

  void decrementQty(int productId, int sizeId) {
    final target = state.firstWhere(
      (item) => item.productId == productId && item.sizeId == sizeId,
      orElse: () => const CartItemModel(
        productId: 0,
        productName: '',
        sizeId: 0,
        sizeName: '',
        price: 0,
        quantity: 0,
      ),
    );

    if (target.quantity <= 1) {
      removeItem(productId, sizeId);
    } else {
      state = [
        for (final item in state)
          if (item.productId == productId && item.sizeId == sizeId)
            item.copyWith(quantity: item.quantity - 1)
          else
            item,
      ];
    }
  }

  void removeItem(int productId, int sizeId) {
    state = state
        .where((item) => !(item.productId == productId && item.sizeId == sizeId))
        .toList();
  }

  void clearCart() {
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

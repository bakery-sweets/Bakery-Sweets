import '../../../core/utils/json_utils.dart';

class CartItemModel {
  final int? cartId;
  final int productId;
  final String productName;
  final String? image;
  final int sizeId;
  final String sizeName;
  final double price;
  final int quantity;
  final int? stockQuantity; // Tồn kho của size, null nếu chưa biết

  const CartItemModel({
    this.cartId,
    required this.productId,
    required this.productName,
    this.image,
    required this.sizeId,
    required this.sizeName,
    required this.price,
    required this.quantity,
    this.stockQuantity,
  });

  double get subtotal => price * quantity;

  CartItemModel copyWith({
    int? cartId,
    int? productId,
    String? productName,
    String? image,
    int? sizeId,
    String? sizeName,
    double? price,
    int? quantity,
    int? stockQuantity,
  }) {
    return CartItemModel(
      cartId: cartId ?? this.cartId,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      image: image ?? this.image,
      sizeId: sizeId ?? this.sizeId,
      sizeName: sizeName ?? this.sizeName,
      price: price ?? this.price,
      quantity: quantity ?? this.quantity,
      stockQuantity: stockQuantity ?? this.stockQuantity,
    );
  }

  factory CartItemModel.fromJson(Map<String, dynamic> json) {
    return CartItemModel(
      cartId: json['cart_id'] as int?,
      productId: json['product_id'] as int? ?? 0,
      productName: json['product_name'] as String? ?? '',
      image: json['image'] as String?,
      sizeId: json['size_id'] as int? ?? 0,
      sizeName: json['size_name'] as String? ?? '',
      price: parseDouble(json['price']),
      quantity: json['quantity'] as int? ?? 1,
      stockQuantity: json['stock_quantity'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'cart_id': cartId,
      'product_id': productId,
      'product_name': productName,
      'image': image,
      'size_id': sizeId,
      'size_name': sizeName,
      'price': price,
      'quantity': quantity,
      'stock_quantity': stockQuantity,
    };
  }
}

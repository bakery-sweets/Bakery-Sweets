import '../../../core/config/app_config.dart';

class ProductSizeModel {
  final int id;
  final int sizeId;
  final String sizeName;
  final double price;
  final int stockQuantity;

  const ProductSizeModel({
    required this.id,
    required this.sizeId,
    required this.sizeName,
    required this.price,
    required this.stockQuantity,
  });

  factory ProductSizeModel.fromJson(Map<String, dynamic> json) {
    return ProductSizeModel(
      id: json['id'] as int? ?? 0,
      sizeId: json['size_id'] as int? ?? 0,
      sizeName: json['size_name'] as String? ?? 'Tiêu chuẩn',
      price: (json['price'] is num)
          ? (json['price'] as num).toDouble()
          : double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      stockQuantity: json['stock_quantity'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'size_id': sizeId,
      'size_name': sizeName,
      'price': price,
      'stock_quantity': stockQuantity,
    };
  }
}

class ProductModel {
  final int productId;
  final String productName;
  final int? categoryId;
  final String? categoryName;
  final String status;
  final String? ingredients;
  final String? expirationDate;
  final String? storageInstructions;
  final String? image;
  final List<ProductSizeModel> sizes;

  const ProductModel({
    required this.productId,
    required this.productName,
    this.categoryId,
    this.categoryName,
    this.status = 'Available',
    this.ingredients,
    this.expirationDate,
    this.storageInstructions,
    this.image,
    this.sizes = const [],
  });

  double get defaultPrice {
    if (sizes.isNotEmpty) {
      return sizes.first.price;
    }
    return 0.0;
  }

  double get minPrice {
    if (sizes.isEmpty) return 0.0;
    return sizes.map((s) => s.price).reduce((a, b) => a < b ? a : b);
  }

  double get maxPrice {
    if (sizes.isEmpty) return 0.0;
    return sizes.map((s) => s.price).reduce((a, b) => a > b ? a : b);
  }

  bool hasSize(String sizeQuery) {
    if (sizes.isEmpty) return true;
    final q = sizeQuery.toLowerCase();
    return sizes.any((s) => s.sizeName.toLowerCase().contains(q));
  }

  static String? _resolveImageUrl(String? raw) {
    if (raw == null || raw.trim().isEmpty) return null;
    final path = raw.trim();
    if (path.startsWith('http://') || path.startsWith('https://')) return path;

    // Đường dẫn từ backend /uploads/... (Ví dụ: /uploads/Mousse/Tiramisu_Mousse.jpg)
    if (path.startsWith('/uploads/') || path.startsWith('uploads/')) {
      final cleanPath = path.startsWith('/') ? path : '/$path';
      return '${AppConfig.baseUrl}$cleanPath';
    }

    if (path.startsWith('assets/')) return path;

    final lower = path.toLowerCase();
    final filename = path.split('/').last;

    if (lower.contains('mousse')) {
      return '${AppConfig.baseUrl}/uploads/Mousse/$filename';
    } else if (lower.contains('croissant')) {
      return '${AppConfig.baseUrl}/uploads/Croissant/$filename';
    } else if (lower.contains('tea') || lower.contains('latte') || lower.contains('mallow') || lower.contains('drink')) {
      return '${AppConfig.baseUrl}/uploads/Drink/$filename';
    }
    return '${AppConfig.baseUrl}/uploads/$filename';
  }

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    final rawSizes = json['sizes'] as List<dynamic>? ?? [];
    return ProductModel(
      productId: json['product_id'] as int? ?? 0,
      productName: json['product_name'] as String? ?? '',
      categoryId: json['category_id'] as int?,
      categoryName: json['category_name'] as String?,
      status: json['status'] as String? ?? 'Available',
      ingredients: json['ingredients'] as String?,
      expirationDate: json['expiration_date'] as String?,
      storageInstructions: json['storage_instructions'] as String?,
      image: _resolveImageUrl(json['image'] as String?),
      sizes: rawSizes
          .map((s) => ProductSizeModel.fromJson(s as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'product_id': productId,
      'product_name': productName,
      'category_id': categoryId,
      'category_name': categoryName,
      'status': status,
      'ingredients': ingredients,
      'expiration_date': expirationDate,
      'storage_instructions': storageInstructions,
      'image': image,
      'sizes': sizes.map((s) => s.toJson()).toList(),
    };
  }
}

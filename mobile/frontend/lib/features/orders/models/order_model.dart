class OrderItemModel {
  final int productId;
  final String productName;
  final String? image;
  final int sizeId;
  final String sizeName;
  final int quantity;
  final double price;
  final double subtotal;

  const OrderItemModel({
    required this.productId,
    required this.productName,
    this.image,
    required this.sizeId,
    required this.sizeName,
    required this.quantity,
    required this.price,
    required this.subtotal,
  });

  static String? _resolveImageUrl(String? raw) {
    if (raw == null || raw.trim().isEmpty) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    final lower = raw.toLowerCase();
    if (lower.contains('chocolate')) {
      return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop';
    } else if (lower.contains('matcha')) {
      return 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop';
    } else if (lower.contains('croissant')) {
      return 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop';
    } else if (lower.contains('peach') || lower.contains('tra') || lower.contains('tea')) {
      return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop';
    } else if (lower.contains('strawberry') || lower.contains('shortcake')) {
      return 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&auto=format&fit=crop';
    } else if (lower.contains('almond')) {
      return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop';
    }
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop';
  }

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      productId: json['product_id'] as int? ?? 0,
      productName: json['product_name'] as String? ?? '',
      image: _resolveImageUrl(json['image'] as String?),
      sizeId: json['size_id'] as int? ?? 0,
      sizeName: json['size_name'] as String? ?? 'Tiêu chuẩn',
      quantity: json['quantity'] as int? ?? 1,
      price: double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      subtotal: double.tryParse(json['subtotal']?.toString() ?? '0') ?? 0.0,
    );
  }
}

class OrderModel {
  final int orderId;
  final String? orderCode;
  final String recipientName;
  final String recipientPhone;
  final String? pickupTime;
  final String? notes;
  final double totalCost;
  final double finalCost;
  final String paymentMethod;
  final String status;
  final String? orderDate;
  final List<OrderItemModel> details;

  const OrderModel({
    required this.orderId,
    this.orderCode,
    required this.recipientName,
    required this.recipientPhone,
    this.pickupTime,
    this.notes,
    required this.totalCost,
    required this.finalCost,
    required this.paymentMethod,
    required this.status,
    this.orderDate,
    this.details = const [],
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    final rawDetails = json['details'] as List<dynamic>? ?? [];
    return OrderModel(
      orderId: json['order_id'] as int? ?? 0,
      orderCode: json['order_code'] as String?,
      recipientName: json['recipient_name'] as String? ?? '',
      recipientPhone: json['recipient_phone'] as String? ?? '',
      pickupTime: json['pickup_time'] as String?,
      notes: json['notes'] as String?,
      totalCost: double.tryParse(json['total_cost']?.toString() ?? '0') ?? 0.0,
      finalCost: double.tryParse(json['final_cost']?.toString() ?? '0') ?? 0.0,
      paymentMethod: json['payment_method'] as String? ?? 'COD',
      status: json['status'] as String? ?? 'Pending',
      orderDate: json['order_date'] as String?,
      details: rawDetails
          .map((d) => OrderItemModel.fromJson(d as Map<String, dynamic>))
          .toList(),
    );
  }
}

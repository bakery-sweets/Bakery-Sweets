import '../../../core/utils/json_utils.dart';

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

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      productId: json['product_id'] as int? ?? 0,
      productName: json['product_name'] as String? ?? '',
      // Giữ nguyên đường dẫn server (/uploads/...), AppImage tự ghép thành URL như ở giỏ hàng / trang sản phẩm
      image: (json['image'] as String?)?.trim().isEmpty ?? true ? null : (json['image'] as String).trim(),
      sizeId: json['size_id'] as int? ?? 0,
      sizeName: json['size_name'] as String? ?? 'Tiêu chuẩn',
      quantity: json['quantity'] as int? ?? 1,
      price: parseDouble(json['price']),
      subtotal: parseDouble(json['subtotal']),
    );
  }
}

class OrderStatusLogModel {
  final String? oldStatus;
  final String newStatus;
  final String? note;
  final String? changedAt;

  const OrderStatusLogModel({
    this.oldStatus,
    required this.newStatus,
    this.note,
    this.changedAt,
  });

  factory OrderStatusLogModel.fromJson(Map<String, dynamic> json) {
    return OrderStatusLogModel(
      oldStatus: json['old_status'] as String?,
      newStatus: json['new_status'] as String? ?? '',
      note: json['note'] as String?,
      changedAt: json['changed_at']?.toString(),
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
  final double discountAmount;
  final double finalCost;
  final String paymentMethod;
  final String paymentStatus;
  final String status;
  final String? orderDate;
  final List<OrderItemModel> details;
  final List<OrderStatusLogModel> statusLogs;

  const OrderModel({
    required this.orderId,
    this.orderCode,
    required this.recipientName,
    required this.recipientPhone,
    this.pickupTime,
    this.notes,
    required this.totalCost,
    this.discountAmount = 0,
    required this.finalCost,
    required this.paymentMethod,
    this.paymentStatus = 'Unpaid',
    required this.status,
    this.orderDate,
    this.details = const [],
    this.statusLogs = const [],
  });

  /// Tổng số bánh trong đơn
  int get totalQuantity => details.fold(0, (sum, d) => sum + d.quantity);

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    final rawDetails = json['details'] as List<dynamic>? ?? [];
    final rawLogs = json['status_logs'] as List<dynamic>? ?? [];
    return OrderModel(
      orderId: json['order_id'] as int? ?? 0,
      orderCode: json['order_code'] as String?,
      recipientName: json['recipient_name'] as String? ?? '',
      recipientPhone: json['recipient_phone'] as String? ?? '',
      pickupTime: json['pickup_time'] as String?,
      notes: json['notes'] as String?,
      totalCost: parseDouble(json['total_cost']),
      discountAmount: parseDouble(json['discount_amount']),
      finalCost: parseDouble(json['final_cost']),
      paymentMethod: json['payment_method'] as String? ?? 'COD',
      paymentStatus: json['payment_status'] as String? ?? 'Unpaid',
      status: json['status'] as String? ?? 'Pending',
      orderDate: json['order_date'] as String?,
      details: rawDetails
          .map((d) => OrderItemModel.fromJson(d as Map<String, dynamic>))
          .toList(),
      // Sắp theo thời gian tăng dần (chuỗi ISO so sánh được trực tiếp)
      statusLogs: rawLogs
          .map((l) => OrderStatusLogModel.fromJson(l as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => (a.changedAt ?? '').compareTo(b.changedAt ?? '')),
    );
  }
}

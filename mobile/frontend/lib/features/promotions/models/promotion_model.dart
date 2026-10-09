class PromotionModel {
  final int promotionId;
  final String promotionCode;
  final String promotionName;
  final String? description;
  final DateTime? startDate;
  final DateTime? endDate;
  final String status;
  final double minOrderValue;
  final double discountPercentage;
  final double? maxDiscountValue;
  final int usageLimitPerUser;
  final int? totalUsageLimit;
  final int usedByCurrentUser;
  final bool isUsed;
  final bool canUse;

  const PromotionModel({
    required this.promotionId,
    required this.promotionCode,
    required this.promotionName,
    this.description,
    this.startDate,
    this.endDate,
    this.status = 'Active',
    this.minOrderValue = 0.0,
    this.discountPercentage = 0.0,
    this.maxDiscountValue,
    this.usageLimitPerUser = 1,
    this.totalUsageLimit,
    this.usedByCurrentUser = 0,
    this.isUsed = false,
    this.canUse = true,
  });

  double calculateDiscount(double orderTotal) {
    if (isUsed || !canUse) return 0.0;
    if (orderTotal < minOrderValue) return 0.0;
    double discount = orderTotal * (discountPercentage / 100.0);
    if (maxDiscountValue != null && discount > maxDiscountValue!) {
      discount = maxDiscountValue!;
    }
    return discount;
  }

  bool isEligible(double orderTotal) {
    if (isUsed || !canUse) return false;
    return orderTotal >= minOrderValue;
  }

  factory PromotionModel.fromJson(Map<String, dynamic> json) {
    final limitPerUser = json['usage_limit_per_user'] as int? ?? 1;
    final usedCount = json['used_by_current_user'] as int? ?? 0;
    final isUsedFlag = json['is_used'] as bool? ?? (usedCount >= limitPerUser);
    final canUseFlag = json['can_use'] as bool? ?? (!isUsedFlag);

    return PromotionModel(
      promotionId: json['promotion_id'] as int? ?? 0,
      promotionCode: json['promotion_code'] as String? ?? '',
      promotionName: json['promotion_name'] as String? ?? '',
      description: json['description'] as String?,
      startDate: json['start_date'] != null ? DateTime.tryParse(json['start_date'].toString()) : null,
      endDate: json['end_date'] != null ? DateTime.tryParse(json['end_date'].toString()) : null,
      status: json['status'] as String? ?? 'Active',
      minOrderValue: (json['min_order_value'] is num)
          ? (json['min_order_value'] as num).toDouble()
          : double.tryParse(json['min_order_value']?.toString() ?? '0') ?? 0.0,
      discountPercentage: (json['discount_percentage'] is num)
          ? (json['discount_percentage'] as num).toDouble()
          : double.tryParse(json['discount_percentage']?.toString() ?? '0') ?? 0.0,
      maxDiscountValue: json['max_discount_value'] != null
          ? ((json['max_discount_value'] is num)
              ? (json['max_discount_value'] as num).toDouble()
              : double.tryParse(json['max_discount_value'].toString()))
          : null,
      usageLimitPerUser: limitPerUser,
      totalUsageLimit: json['total_usage_limit'] as int?,
      usedByCurrentUser: usedCount,
      isUsed: isUsedFlag,
      canUse: canUseFlag,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'promotion_id': promotionId,
      'promotion_code': promotionCode,
      'promotion_name': promotionName,
      'description': description,
      'start_date': startDate?.toIso8601String(),
      'end_date': endDate?.toIso8601String(),
      'status': status,
      'min_order_value': minOrderValue,
      'discount_percentage': discountPercentage,
      'max_discount_value': maxDiscountValue,
      'usage_limit_per_user': usageLimitPerUser,
      'total_usage_limit': totalUsageLimit,
      'used_by_current_user': usedByCurrentUser,
      'is_used': isUsed,
      'can_use': canUse,
    };
  }
}

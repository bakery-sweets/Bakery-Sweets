import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/network/api_client.dart';
import '../models/promotion_model.dart';

final List<PromotionModel> _defaultPromotions = [
  const PromotionModel(
    promotionId: 3,
    promotionCode: 'SWEET10',
    promotionName: 'Voucher Chào Bạn Mới',
    description: 'Giảm 10% tối đa 20.000đ cho đơn từ 80.000đ',
    minOrderValue: 80000.0,
    discountPercentage: 10.0,
    maxDiscountValue: 20000.0,
  ),
  const PromotionModel(
    promotionId: 4,
    promotionCode: 'BANHNGOT',
    promotionName: 'Tuần Lễ Bánh Ngọt',
    description: 'Giảm 15% tối đa 35.000đ cho đơn từ 150.000đ',
    minOrderValue: 150000.0,
    discountPercentage: 15.0,
    maxDiscountValue: 35000.0,
  ),
  const PromotionModel(
    promotionId: 1,
    promotionCode: 'CTKM01',
    promotionName: 'Ưu đãi Khách hàng Thân thiết',
    description: 'Giảm 10% tối đa 30.000đ cho đơn từ 200.000đ',
    minOrderValue: 200000.0,
    discountPercentage: 10.0,
    maxDiscountValue: 30000.0,
  ),
  const PromotionModel(
    promotionId: 2,
    promotionCode: 'CTKM02',
    promotionName: 'Tri ân Mùa Lễ Hội',
    description: 'Giảm 12% tối đa 50.000đ cho đơn từ 300.000đ',
    minOrderValue: 300000.0,
    discountPercentage: 12.0,
    maxDiscountValue: 50000.0,
  ),
];

final promotionsProvider = FutureProvider<List<PromotionModel>>((ref) async {
  ref.watch(authProvider.select((s) => s.isAuthenticated));
  try {
    final response = await ApiClient().dio.get('/promotions');
    if (response.statusCode == 200 && response.data is List) {
      final list = (response.data as List)
          .map((p) => PromotionModel.fromJson(p as Map<String, dynamic>))
          .toList();
      if (list.isNotEmpty) return list;
    }
  } catch (e) {
    if (kDebugMode) {
      debugPrint('[API Promotions Error] $e');
    }
  }
  return _defaultPromotions;
});

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/network/api_client.dart';
import '../models/promotion_model.dart';

// Provider danh sách Voucher (lấy 100% từ Server qua Backend API)
final promotionsProvider = FutureProvider<List<PromotionModel>>((ref) async {
  ref.watch(authProvider.select((s) => s.isAuthenticated));
  try {
    final response = await ApiClient().dio.get('/promotions');
    if (response.statusCode == 200 && response.data is List) {
      return (response.data as List)
          .map((p) => PromotionModel.fromJson(p as Map<String, dynamic>))
          .toList();
    }
    return [];
  } catch (e) {
    if (kDebugMode) {
      debugPrint('[API Promotions Error] $e');
    }
    rethrow;
  }
});

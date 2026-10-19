import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/no_internet_widget.dart';
import '../../navigation/screens/main_navigation_screen.dart';
import '../models/promotion_model.dart';
import '../providers/promotions_provider.dart';

class PromotionsScreen extends ConsumerWidget {
  const PromotionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final promosAsync = ref.watch(promotionsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Kho Voucher & Ưu đãi'),
      ),
      body: promosAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (e, s) => NoInternetWidget(
          title: 'Không thể tải kho voucher',
          message: 'Vui lòng kết nối WiFi để tải danh sách ưu đãi mới nhất từ tiệm bánh.',
          onRetry: () => ref.invalidate(promotionsProvider),
        ),
        data: (promos) {
          if (promos.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: const BoxDecoration(
                      color: AppColors.primaryLight,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.confirmation_num_outlined, size: 50, color: AppColors.primary),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Hiện chưa có mã ưu đãi nào',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async => ref.refresh(promotionsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: promos.length,
              separatorBuilder: (_, _) => const SizedBox(height: 14),
              itemBuilder: (context, idx) {
                final promo = promos[idx];
                return _VoucherCard(promo: promo);
              },
            ),
          );
        },
      ),
    );
  }
}

class _VoucherCard extends ConsumerWidget {
  final PromotionModel promo;
  const _VoucherCard({required this.promo});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isUsed = promo.isUsed || !promo.canUse;
    final expiryStr = isUsed
        ? 'Đã sử dụng'
        : (promo.endDate != null
            ? 'HSD: ${DateFormat('dd/MM/yyyy').format(promo.endDate!)}'
            : 'Có hiệu lực');

    return Container(
      decoration: BoxDecoration(
        color: isUsed ? Colors.grey.shade50 : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isUsed ? Colors.grey.shade200 : AppColors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isUsed ? 0.015 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: IntrinsicHeight(
        child: Row(
          children: [
            // Cột bên trái: Mức giảm giá & màu chủ đạo
            Container(
              width: 105,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 16),
              decoration: BoxDecoration(
                color: isUsed
                    ? Colors.grey.shade200
                    : AppColors.primary.withValues(alpha: 0.12),
                borderRadius: const BorderRadius.horizontal(left: Radius.circular(15)),
                border: Border(
                  right: BorderSide(
                    color: isUsed ? Colors.grey.shade300 : AppColors.border,
                    width: 1,
                    style: BorderStyle.solid,
                  ),
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    isUsed ? Icons.check_circle_outline_rounded : Icons.card_giftcard,
                    color: isUsed ? AppColors.textMuted : AppColors.primary,
                    size: 28,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'GIẢM ${promo.discountPercentage.toInt()}%',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: isUsed ? AppColors.textMuted : AppColors.primary,
                    ),
                  ),
                  if (promo.maxDiscountValue != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      'Tối đa ${(promo.maxDiscountValue! / 1000).toInt()}k',
                      style: const TextStyle(fontSize: 10.5, color: AppColors.textMuted),
                    ),
                  ],
                ],
              ),
            ),

            // Cột bên phải: Chi tiết & nút
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Mã voucher
                        InkWell(
                          onTap: () {
                            Clipboard.setData(ClipboardData(text: promo.promotionCode));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Đã sao chép mã ${promo.promotionCode}'),
                                duration: const Duration(seconds: 1),
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(6),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isUsed ? Colors.grey.shade200 : AppColors.primaryLight,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: isUsed ? Colors.grey.shade300 : AppColors.primary.withValues(alpha: 0.4),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  promo.promotionCode,
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.bold,
                                    color: isUsed ? AppColors.textMuted : AppColors.primary,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Icon(Icons.copy_rounded, size: 12, color: isUsed ? AppColors.textMuted : AppColors.primary),
                              ],
                            ),
                          ),
                        ),
                        if (isUsed)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade200,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: Colors.grey.shade400, width: 0.8),
                            ),
                            child: const Text(
                              'ĐÃ SỬ DỤNG',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMuted),
                            ),
                          )
                        else
                          Text(
                            expiryStr,
                            style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      promo.promotionName,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: isUsed ? AppColors.textMuted : AppColors.navy,
                        decoration: isUsed ? TextDecoration.lineThrough : null,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      isUsed
                          ? 'Mỗi tài khoản chỉ được áp dụng mã này 1 lần duy nhất'
                          : (promo.description ?? 'Đơn tối thiểu ${AppTheme.formatCurrency(promo.minOrderValue)}'),
                      style: TextStyle(
                        fontSize: 12,
                        color: isUsed ? AppColors.textMuted : AppColors.textSecondary,
                        fontStyle: isUsed ? FontStyle.italic : FontStyle.normal,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Đơn từ ${AppTheme.formatCurrency(promo.minOrderValue)}',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isUsed ? AppColors.textMuted : AppColors.navy,
                          ),
                        ),
                        if (isUsed)
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.grey.shade300,
                              foregroundColor: AppColors.textMuted,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            onPressed: null,
                            child: const Text(
                              'Đã sử dụng',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          )
                        else
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            onPressed: () {
                              // Chuyển sang Tab Home (Menu bánh) để mua sắm áp dụng voucher
                              ref.read(navigationIndexProvider.notifier).setIndex(0);
                              Navigator.of(context).popUntil((route) => route.isFirst);
                            },
                            child: const Text('Dùng ngay', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

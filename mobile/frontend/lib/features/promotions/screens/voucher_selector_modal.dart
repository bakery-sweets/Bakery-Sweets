import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../models/promotion_model.dart';
import '../providers/promotions_provider.dart';

class VoucherSelectorModal extends ConsumerStatefulWidget {
  final double orderTotal;
  final PromotionModel? selectedPromotion;

  const VoucherSelectorModal({
    super.key,
    required this.orderTotal,
    this.selectedPromotion,
  });

  static Future<PromotionModel?> show(
    BuildContext context, {
    required double orderTotal,
    PromotionModel? selectedPromotion,
  }) {
    return showModalBottomSheet<PromotionModel>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => VoucherSelectorModal(
        orderTotal: orderTotal,
        selectedPromotion: selectedPromotion,
      ),
    );
  }

  @override
  ConsumerState<VoucherSelectorModal> createState() => _VoucherSelectorModalState();
}

class _VoucherSelectorModalState extends ConsumerState<VoucherSelectorModal> {
  late PromotionModel? _selected;
  final _codeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selected = widget.selectedPromotion;
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  void _applyManualCode(List<PromotionModel> promos) {
    final code = _codeController.text.trim().toUpperCase();
    if (code.isEmpty) return;

    final found = promos.firstWhere(
      (p) => p.promotionCode.toUpperCase() == code,
      orElse: () => const PromotionModel(
        promotionId: 0,
        promotionCode: '',
        promotionName: '',
      ),
    );

    if (found.promotionId == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Mã voucher không hợp lệ hoặc đã hết hạn')),
      );
      return;
    }

    if (found.isUsed || !found.canUse) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bạn đã sử dụng mã ưu đãi này rồi. Mỗi tài khoản chỉ được dùng 1 lần!'),
        ),
      );
      return;
    }

    if (!found.isEligible(widget.orderTotal)) {
      final needed = found.minOrderValue - widget.orderTotal;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Đơn hàng chưa đủ điều kiện. Cần mua thêm ${AppTheme.formatCurrency(needed)} để áp dụng mã này.',
          ),
        ),
      );
      return;
    }

    setState(() => _selected = found);
    Navigator.pop(context, found);
  }

  @override
  Widget build(BuildContext context) {
    final promosAsync = ref.watch(promotionsProvider);
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      padding: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.inputBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 12),

            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Chọn Voucher Ưu Đãi',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: AppColors.navy,
                    ),
                  ),
                  if (_selected != null)
                    TextButton(
                      onPressed: () {
                        setState(() => _selected = null);
                        Navigator.pop(context, null);
                      },
                      child: const Text('Bỏ chọn', style: TextStyle(color: AppColors.danger, fontSize: 13)),
                    ),
                ],
              ),
            ),

            // Ô nhập mã thủ công
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _codeController,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: 'Nhập mã voucher (VD: SWEET10)',
                        hintStyle: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        isDense: true,
                        filled: true,
                        fillColor: AppColors.surfaceVariant,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  promosAsync.maybeWhen(
                    data: (promos) => ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                      ),
                      onPressed: () => _applyManualCode(promos),
                      child: const Text('Áp dụng', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ),
                    orElse: () => const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Danh sách voucher
            Expanded(
              child: promosAsync.when(
                loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
                error: (e, s) => Center(child: Text('Lỗi tải voucher: $e')),
                data: (promos) {
                  if (promos.isEmpty) {
                    return const Center(child: Text('Chưa có mã khuyến mãi nào'));
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: promos.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, idx) {
                      final promo = promos[idx];
                      final isUsed = promo.isUsed || !promo.canUse;
                      final isSelected = _selected?.promotionId == promo.promotionId;
                      final isEligible = !isUsed && promo.isEligible(widget.orderTotal);
                      final discountValue = promo.calculateDiscount(widget.orderTotal);

                      return InkWell(
                        onTap: isEligible
                            ? () {
                                setState(() => _selected = promo);
                                Navigator.pop(context, promo);
                              }
                            : null,
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: isUsed
                                ? Colors.grey.shade100
                                : (isEligible
                                    ? (isSelected ? AppColors.primaryLight.withValues(alpha: 0.35) : Colors.white)
                                    : AppColors.surfaceVariant.withValues(alpha: 0.5)),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isSelected
                                  ? AppColors.primary
                                  : (isEligible ? AppColors.cardBorder : Colors.grey.shade200),
                              width: isSelected ? 1.5 : 1,
                            ),
                            boxShadow: isEligible
                                ? [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.03),
                                      blurRadius: 6,
                                      offset: const Offset(0, 2),
                                    )
                                  ]
                                : null,
                          ),
                          child: Row(
                            children: [
                              // Ticket badge icon
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: isUsed
                                      ? Colors.grey.shade200
                                      : (isEligible ? AppColors.primaryLight : AppColors.surfaceVariant),
                                  shape: BoxShape.circle,
                                ),
                                child: Center(
                                  child: Icon(
                                    isUsed ? Icons.check_circle_outline_rounded : Icons.confirmation_num_outlined,
                                    color: isUsed
                                        ? AppColors.textMuted
                                        : (isEligible ? AppColors.primary : AppColors.textMuted),
                                    size: 22,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),

                              // Thông tin voucher
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: isUsed
                                                ? Colors.grey.shade400
                                                : (isEligible ? AppColors.primary : AppColors.textMuted),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            promo.promotionCode,
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.white,
                                            ),
                                          ),
                                        ),
                                        if (isUsed) ...[
                                          const SizedBox(width: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: Colors.grey.shade200,
                                              borderRadius: BorderRadius.circular(4),
                                              border: Border.all(color: Colors.grey.shade400, width: 0.8),
                                            ),
                                            child: const Text(
                                              'ĐÃ DÙNG',
                                              style: TextStyle(
                                                fontSize: 9.5,
                                                fontWeight: FontWeight.w700,
                                                color: AppColors.textMuted,
                                              ),
                                            ),
                                          ),
                                        ],
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            promo.promotionName,
                                            style: TextStyle(
                                              fontSize: 13.5,
                                              fontWeight: FontWeight.bold,
                                              color: isUsed
                                                  ? AppColors.textMuted
                                                  : (isEligible ? AppColors.navy : AppColors.textMuted),
                                              decoration: isUsed ? TextDecoration.lineThrough : null,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      promo.description ?? 'Giảm ${promo.discountPercentage.toInt()}%',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: isUsed
                                            ? AppColors.textMuted
                                            : (isEligible ? AppColors.textSecondary : AppColors.textMuted),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    if (isUsed)
                                      const Text(
                                        'Bạn đã dùng mã này rồi (Mỗi tài khoản 1 lần)',
                                        style: TextStyle(
                                          fontSize: 11.5,
                                          color: AppColors.textMuted,
                                          fontStyle: FontStyle.italic,
                                        ),
                                      )
                                    else if (isEligible)
                                      Text(
                                        'Tiết kiệm: ${AppTheme.formatCurrency(discountValue)}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.primary,
                                        ),
                                      )
                                    else
                                      Text(
                                        'Mua thêm ${AppTheme.formatCurrency(promo.minOrderValue - widget.orderTotal)} để dùng',
                                        style: const TextStyle(
                                          fontSize: 11.5,
                                          fontStyle: FontStyle.italic,
                                          color: AppColors.danger,
                                        ),
                                      ),
                                  ],
                                ),
                              ),

                              // Radio / Select indicator
                              if (isEligible)
                                Container(
                                  width: 22,
                                  height: 22,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: isSelected ? AppColors.primary : AppColors.inputBorder,
                                      width: 2,
                                    ),
                                  ),
                                  child: isSelected
                                      ? Center(
                                          child: Container(
                                            width: 12,
                                            height: 12,
                                            decoration: const BoxDecoration(
                                              color: AppColors.primary,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                        )
                                      : null,
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

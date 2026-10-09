import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_image.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/screens/login_modal.dart';
import '../models/order_model.dart';
import '../providers/orders_provider.dart';

class OrdersScreen extends ConsumerWidget {
  final VoidCallback? onStartShopping;
  const OrdersScreen({super.key, this.onStartShopping});

  String _formatDateTime(String? raw) {
    if (raw == null || raw.isEmpty) return '--';
    try {
      final dt = DateTime.parse(raw).toLocal();
      final now = DateTime.now();
      final isToday = dt.year == now.year && dt.month == now.month && dt.day == now.day;
      final timeStr = DateFormat('HH:mm').format(dt);
      if (isToday) {
        return 'Hôm nay lúc $timeStr';
      }
      return '${DateFormat('dd/MM/yyyy').format(dt)} lúc $timeStr';
    } catch (_) {
      return raw;
    }
  }

  Widget _buildStatusBadge(String status) {
    Color bg;
    Color text;
    String label;
    switch (status.toLowerCase()) {
      case 'pending':
        bg = const Color(0xFFFEF3C7);
        text = const Color(0xFFD97706);
        label = 'Chờ xác nhận';
        break;
      case 'processing':
        bg = const Color(0xFFDBEAFE);
        text = const Color(0xFF1D4ED8);
        label = 'Đang làm bánh';
        break;
      case 'ready':
        bg = const Color(0xFFD1FAE5);
        text = const Color(0xFF047857);
        label = 'Sẵn sàng nhận';
        break;
      case 'completed':
        bg = const Color(0xFFF1F5F9);
        text = const Color(0xFF475569);
        label = 'Đã nhận bánh';
        break;
      case 'cancelled':
        bg = const Color(0xFFFEE2E2);
        text = const Color(0xFFDC2626);
        label = 'Đã hủy';
        break;
      default:
        bg = AppColors.surfaceVariant;
        text = AppColors.textSecondary;
        label = status;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(color: text, fontSize: 11.5, fontWeight: FontWeight.w700),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final ordersState = ref.watch(ordersProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Lịch sử đơn hàng'),
        actions: [
          if (auth.isAuthenticated)
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: AppColors.navy),
              onPressed: () {
                ref.read(ordersProvider.notifier).fetchOrders();
              },
            ),
        ],
      ),
      body: !auth.isAuthenticated
          ? _buildUnauthenticatedView(context)
          : ordersState.isLoading && ordersState.orders.isEmpty
              ? const Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                )
              : ordersState.orders.isEmpty
                  ? _buildEmptyOrdersView(context)
                  : RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: () => ref.read(ordersProvider.notifier).fetchOrders(),
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                        itemCount: ordersState.orders.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 14),
                        itemBuilder: (context, index) {
                          final order = ordersState.orders[index];
                          return _buildOrderCard(context, order);
                        },
                      ),
                    ),
    );
  }

  Widget _buildUnauthenticatedView(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.lock_outline_rounded,
                size: 56,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Đăng nhập để xem đơn hàng',
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Vui lòng đăng nhập để xem lịch sử đặt bánh, theo dõi trạng thái nhận bánh tại tiệm (Pick-up).',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13.5,
                color: AppColors.textSecondary,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
              onPressed: () => LoginModal.show(context),
              icon: const Icon(Icons.login_rounded, size: 18),
              label: const Text('Đăng nhập ngay', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyOrdersView(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.border),
              ),
              child: const Icon(
                Icons.receipt_long_outlined,
                size: 56,
                color: AppColors.navy,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Chưa có đơn hàng nào',
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Bạn chưa đặt chiếc bánh nào tại The Sweets. Hãy chọn những món bánh thơm ngon ngay nhé!',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13.5,
                color: AppColors.textSecondary,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
              onPressed: onStartShopping,
              icon: const Icon(Icons.storefront, size: 18),
              label: const Text('Bắt đầu đặt bánh', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderCard(BuildContext context, OrderModel order) {
    final code = order.orderCode ?? 'DH#${order.orderId}';
    final isBanking = order.paymentMethod.toLowerCase() == 'banking';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Header Đơn Hàng (Mã & Trạng thái)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: const BoxDecoration(
              color: AppColors.surfaceVariant,
              borderRadius: BorderRadius.vertical(top: Radius.circular(13)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.receipt_outlined, size: 18, color: AppColors.navy),
                    const SizedBox(width: 6),
                    Text(
                      '#$code',
                      style: const TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.navy,
                      ),
                    ),
                  ],
                ),
                _buildStatusBadge(order.status),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 2. Chi tiết nhận tại tiệm (Pick-up)
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.access_time_rounded, size: 16, color: AppColors.primary),
                          const SizedBox(width: 6),
                          const Text('Giờ nhận bánh: ', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          Expanded(
                            child: Text(
                              _formatDateTime(order.pickupTime),
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            isBanking ? Icons.account_balance_outlined : Icons.payments_outlined,
                            size: 16,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: 6),
                          const Text('Thanh toán: ', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          Expanded(
                            child: Text(
                              isBanking ? 'Chuyển khoản ngân hàng (Banking)' : 'Tiền mặt khi nhận bánh (COD)',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.navy),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.person_outline, size: 16, color: AppColors.primary),
                          const SizedBox(width: 6),
                          const Text('Người nhận: ', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          Expanded(
                            child: Text(
                              '${order.recipientName} - ${order.recipientPhone}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                            ),
                          ),
                        ],
                      ),
                      if (order.notes != null && order.notes!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.edit_note, size: 16, color: AppColors.primary),
                            const SizedBox(width: 6),
                            const Text('Ghi chú: ', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                            Expanded(
                              child: Text(
                                order.notes!,
                                style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: AppColors.textPrimary),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),

                const SizedBox(height: 12),

                // 3. Danh sách bánh trong đơn
                ...order.details.map((item) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: SizedBox(
                            width: 44,
                            height: 44,
                            child: AppImage(
                              imagePath: item.image,
                              fit: BoxFit.cover,
                              placeholder: Container(color: AppColors.surfaceVariant),
                              errorWidget: Container(
                                color: AppColors.primaryLight,
                                child: const Center(child: Text('🧁', style: TextStyle(fontSize: 18))),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.productName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Size: ${item.sizeName}  x${item.quantity}',
                                style: const TextStyle(fontSize: 11.5, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          AppTheme.formatCurrency(item.subtotal),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                        ),
                      ],
                    ),
                  );
                }),

                const Divider(height: 18),

                // 4. Tổng thanh toán
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Ngày đặt: ${_formatDateTime(order.orderDate)}',
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                    Row(
                      children: [
                        const Text('Tổng tiền: ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                        Text(
                          AppTheme.formatCurrency(order.finalCost),
                          style: const TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

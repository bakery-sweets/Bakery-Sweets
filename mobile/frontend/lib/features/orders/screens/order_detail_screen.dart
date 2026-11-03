import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/date_format_utils.dart';
import '../../../core/widgets/app_image.dart';
import '../models/order_model.dart';
import '../providers/orders_provider.dart';
import '../utils/order_status.dart';

/// Chi tiết một đơn hàng (mở khi bấm vào đơn ở Lịch sử hoặc từ thông báo)
class OrderDetailScreen extends ConsumerWidget {
  final int orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  static Future<void> open(BuildContext context, int orderId) {
    return Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: orderId)),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Ưu tiên đơn trong danh sách đã tải để trạng thái tự cập nhật theo realtime
    final cached = ref.watch(ordersProvider.select(
      (s) => s.orders.where((o) => o.orderId == orderId).firstOrNull,
    ));

    return Scaffold(
      backgroundColor: AppColors.surfaceVariant,
      appBar: AppBar(title: const Text('Chi tiết đơn hàng')),
      body: cached != null
          ? _OrderDetailBody(order: cached)
          : ref.watch(orderDetailProvider(orderId)).when(
                data: (order) => _OrderDetailBody(order: order),
                loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
                error: (err, _) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline_rounded, size: 48, color: AppColors.textMuted),
                        const SizedBox(height: 12),
                        Text(
                          err.toString(),
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 13.5, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 16),
                        OutlinedButton.icon(
                          onPressed: () => ref.invalidate(orderDetailProvider(orderId)),
                          icon: const Icon(Icons.refresh_rounded, size: 18),
                          label: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
    );
  }
}

class _OrderDetailBody extends ConsumerWidget {
  final OrderModel order;
  const _OrderDetailBody({required this.order});

  /// Thời điểm đơn chuyển sang [statusKey] (lần gần nhất), lấy từ lịch sử trạng thái
  String? _reachedAt(String statusKey) {
    if (statusKey == 'pending') return order.orderDate;
    final logs = order.statusLogs.where((l) => l.newStatus.toLowerCase() == statusKey);
    return logs.isEmpty ? null : logs.last.changedAt;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final info = OrderStatus.of(order.status);
    final isCancelled = info.key == 'cancelled';
    final cancelLog = isCancelled
        ? order.statusLogs.where((l) => l.newStatus.toLowerCase() == 'cancelled').lastOrNull
        : null;

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => ref.read(ordersProvider.notifier).fetchOrders(),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          // 1. Trạng thái hiện tại
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
            color: info.background,
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        info.label,
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: info.color,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        isCancelled && (cancelLog?.note?.isNotEmpty ?? false)
                            ? 'Lý do: ${cancelLog!.note}'
                            : info.description,
                        style: TextStyle(fontSize: 12.5, color: info.color.withValues(alpha: 0.9), height: 1.4),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Icon(info.icon, size: 40, color: info.color),
              ],
            ),
          ),

          // 2. Tiến trình đơn
          if (!isCancelled)
            _Section(
              child: _StatusStepper(currentKey: info.key, reachedAt: _reachedAt),
            ),

          // 3. Thông tin nhận bánh
          _Section(
            title: 'Thông tin nhận bánh',
            icon: Icons.location_on_outlined,
            child: Column(
              children: [
                const _InfoRow(label: 'Hình thức', value: 'Nhận tại tiệm The Sweets Bakery'),
                _InfoRow(label: 'Giờ nhận bánh', value: AppDateFormat.dateTime(order.pickupTime), bold: true),
                _InfoRow(label: 'Người nhận', value: order.recipientName),
                _InfoRow(label: 'Số điện thoại', value: order.recipientPhone),
                if (order.notes != null && order.notes!.trim().isNotEmpty)
                  _InfoRow(label: 'Ghi chú', value: order.notes!, italic: true),
              ],
            ),
          ),

          // 4. Danh sách bánh
          _Section(
            title: 'The Sweets Bakery',
            icon: Icons.storefront_outlined,
            child: Column(
              children: [
                for (var i = 0; i < order.details.length; i++) ...[
                  if (i > 0) const Divider(height: 20, color: AppColors.cardBorder),
                  _OrderItemRow(item: order.details[i]),
                ],
              ],
            ),
          ),

          // 5. Thanh toán
          _Section(
            title: 'Chi tiết thanh toán',
            icon: Icons.receipt_long_outlined,
            child: Column(
              children: [
                _InfoRow(label: 'Tổng tiền hàng', value: AppTheme.formatCurrency(order.totalCost)),
                if (order.discountAmount > 0)
                  _InfoRow(
                    label: 'Giảm giá voucher',
                    value: '-${AppTheme.formatCurrency(order.discountAmount)}',
                    valueColor: AppColors.primary,
                  ),
                const _InfoRow(label: 'Phí nhận tại tiệm', value: 'Miễn phí', valueColor: AppColors.success),
                const Divider(height: 18, color: AppColors.cardBorder),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Thành tiền',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                    ),
                    Text(
                      AppTheme.formatCurrency(order.finalCost),
                      style: const TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                _InfoRow(label: 'Phương thức', value: paymentMethodLabel(order.paymentMethod)),
                _InfoRow(
                  label: 'Trạng thái thanh toán',
                  value: paymentStatusLabel(order.paymentStatus),
                  valueColor: order.paymentStatus.toLowerCase() == 'paid' ? AppColors.success : AppColors.textPrimary,
                ),
              ],
            ),
          ),

          // 6. Thông tin đơn
          _Section(
            title: 'Thông tin đơn hàng',
            icon: Icons.info_outline,
            child: Column(
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text('Mã đơn hàng', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                    ),
                    Text(
                      order.orderCode ?? 'DH${order.orderId}',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.navy),
                    ),
                    const SizedBox(width: 4),
                    InkWell(
                      borderRadius: BorderRadius.circular(6),
                      onTap: () {
                        Clipboard.setData(ClipboardData(text: order.orderCode ?? 'DH${order.orderId}'));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Đã sao chép mã đơn hàng'), duration: Duration(seconds: 1)),
                        );
                      },
                      child: const Padding(
                        padding: EdgeInsets.all(4),
                        child: Icon(Icons.copy_rounded, size: 16, color: AppColors.primary),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                _InfoRow(label: 'Thời gian đặt', value: AppDateFormat.dateTime(order.orderDate)),
                if (order.statusLogs.isNotEmpty) ...[
                  const Divider(height: 20, color: AppColors.cardBorder),
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Lịch sử trạng thái',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                    ),
                  ),
                  const SizedBox(height: 8),
                  for (final log in order.statusLogs.reversed) _StatusLogRow(log: log),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Khung trắng cho từng phần của trang chi tiết
class _Section extends StatelessWidget {
  final String? title;
  final IconData? icon;
  final Widget child;

  const _Section({this.title, this.icon, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(16),
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null) ...[
            Row(
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 18, color: AppColors.navy),
                  const SizedBox(width: 6),
                ],
                Text(
                  title!,
                  style: const TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.navy,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
          child,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final bool italic;
  final Color? valueColor;

  const _InfoRow({
    required this.label,
    required this.value,
    this.bold = false,
    this.italic = false,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 13,
                fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                fontStyle: italic ? FontStyle.italic : FontStyle.normal,
                color: valueColor ?? AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OrderItemRow extends StatelessWidget {
  final OrderItemModel item;
  const _OrderItemRow({required this.item});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: SizedBox(
            width: 64,
            height: 64,
            child: AppImage(
              imagePath: item.image,
              fit: BoxFit.cover,
              placeholder: Container(color: AppColors.surfaceVariant),
              errorWidget: Container(
                color: AppColors.primaryLight,
                child: const Center(child: Icon(Icons.cake_outlined, size: 24, color: AppColors.primary)),
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
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 3),
              Text('Size: ${item.sizeName}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              const SizedBox(height: 3),
              Text(
                '${AppTheme.formatCurrency(item.price)} × ${item.quantity}',
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Text(
          AppTheme.formatCurrency(item.subtotal),
          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
      ],
    );
  }
}

/// Thanh tiến trình 4 bước: Chờ xác nhận → Đang làm bánh → Sẵn sàng nhận → Đã nhận bánh
class _StatusStepper extends StatelessWidget {
  final String currentKey;
  final String? Function(String statusKey) reachedAt;

  const _StatusStepper({required this.currentKey, required this.reachedAt});

  @override
  Widget build(BuildContext context) {
    final steps = OrderStatus.flow;
    final currentIndex = steps.indexWhere((s) => s.key == currentKey);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < steps.length; i++)
          Expanded(
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 2,
                        color: i == 0
                            ? Colors.transparent
                            : (i <= currentIndex ? AppColors.primary : AppColors.border),
                      ),
                    ),
                    Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: i <= currentIndex ? AppColors.primary : Colors.white,
                        border: Border.all(
                          color: i <= currentIndex ? AppColors.primary : AppColors.border,
                          width: 1.5,
                        ),
                      ),
                      child: Icon(
                        steps[i].icon,
                        size: 16,
                        color: i <= currentIndex ? Colors.white : AppColors.textMuted,
                      ),
                    ),
                    Expanded(
                      child: Container(
                        height: 2,
                        color: i == steps.length - 1
                            ? Colors.transparent
                            : (i < currentIndex ? AppColors.primary : AppColors.border),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  steps[i].label,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: i == currentIndex ? FontWeight.w700 : FontWeight.w500,
                    color: i <= currentIndex ? AppColors.textPrimary : AppColors.textMuted,
                  ),
                ),
                if (i <= currentIndex && reachedAt(steps[i].key) != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    AppDateFormat.short(reachedAt(steps[i].key)),
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                  ),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

class _StatusLogRow extends StatelessWidget {
  final OrderStatusLogModel log;
  const _StatusLogRow({required this.log});

  @override
  Widget build(BuildContext context) {
    final info = OrderStatus.of(log.newStatus);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Icon(info.icon, size: 16, color: info.color),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  info.label,
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
                if (log.note != null && log.note!.trim().isNotEmpty)
                  Text(log.note!, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              ],
            ),
          ),
          Text(
            AppDateFormat.dateTime(log.changedAt),
            style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }
}

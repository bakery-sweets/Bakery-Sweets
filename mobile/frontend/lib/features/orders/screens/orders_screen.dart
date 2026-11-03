import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/date_format_utils.dart';
import '../../../core/widgets/app_image.dart';
import '../../../core/widgets/no_internet_widget.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/screens/login_modal.dart';
import '../models/order_model.dart';
import '../providers/orders_provider.dart';
import '../utils/order_status.dart';
import 'order_detail_screen.dart';

/// Lịch sử đơn hàng: chia tab theo trạng thái, bấm vào đơn để xem chi tiết
class OrdersScreen extends ConsumerWidget {
  final VoidCallback? onStartShopping;
  const OrdersScreen({super.key, this.onStartShopping});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final ordersState = ref.watch(ordersProvider);
    final orders = ordersState.orders;

    int countOf(OrderStatusInfo info) =>
        orders.where((o) => o.status.toLowerCase() == info.key).length;

    return DefaultTabController(
      length: OrderStatus.tabs.length + 1,
      child: Scaffold(
        backgroundColor: AppColors.surfaceVariant,
        appBar: AppBar(
          title: const Text('Lịch sử đơn hàng'),
          actions: [
            if (auth.isAuthenticated)
              IconButton(
                icon: const Icon(Icons.refresh_rounded, color: AppColors.navy),
                onPressed: () => ref.read(ordersProvider.notifier).fetchOrders(),
              ),
          ],
          bottom: auth.isAuthenticated
              ? TabBar(
                  isScrollable: true,
                  tabAlignment: TabAlignment.start,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary,
                  indicatorWeight: 2.5,
                  labelStyle: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
                  unselectedLabelStyle: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w500),
                  dividerColor: AppColors.border,
                  tabs: [
                    const Tab(text: 'Tất cả'),
                    for (final info in OrderStatus.tabs)
                      Tab(child: _TabLabel(label: info.label, count: _showCount(info) ? countOf(info) : 0)),
                  ],
                )
              : null,
        ),
        body: !auth.isAuthenticated
            ? _buildUnauthenticatedView(context)
            : ordersState.isLoading && orders.isEmpty
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : ordersState.errorMessage != null && orders.isEmpty
                    ? NoInternetWidget(
                        title: 'Không thể tải đơn hàng',
                        message: 'Vui lòng kết nối WiFi để xem lịch sử đơn hàng của bạn.',
                        onRetry: () => ref.read(ordersProvider.notifier).fetchOrders(),
                      )
                    : TabBarView(
                        children: [
                          _OrderList(orders: orders, onStartShopping: onStartShopping),
                          for (final info in OrderStatus.tabs)
                            _OrderList(
                              orders: orders.where((o) => o.status.toLowerCase() == info.key).toList(),
                              emptyLabel: 'Chưa có đơn hàng "${info.label}"',
                            ),
                        ],
                      ),
      ),
    );
  }

  /// Chỉ đếm số đơn ở các trạng thái còn đang xử lý (giống Shopee)
  static bool _showCount(OrderStatusInfo info) =>
      info.key == 'pending' || info.key == 'processing' || info.key == 'ready';

  Widget _buildUnauthenticatedView(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                color: AppColors.primaryLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.lock_outline_rounded, size: 56, color: AppColors.primary),
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
              style: TextStyle(fontSize: 13.5, color: AppColors.textSecondary, height: 1.5),
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
}

class _TabLabel extends StatelessWidget {
  final String label;
  final int count;
  const _TabLabel({required this.label, required this.count});

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return Text(label);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label),
        const SizedBox(width: 5),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            '$count',
            style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Colors.white),
          ),
        ),
      ],
    );
  }
}

/// Danh sách đơn của một tab
class _OrderList extends ConsumerWidget {
  final List<OrderModel> orders;
  final String? emptyLabel;
  final VoidCallback? onStartShopping;

  const _OrderList({required this.orders, this.emptyLabel, this.onStartShopping});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Future<void> refresh() => ref.read(ordersProvider.notifier).fetchOrders();

    if (orders.isEmpty) {
      // Vẫn cho kéo xuống để tải lại khi tab trống
      return RefreshIndicator(
        color: AppColors.primary,
        onRefresh: refresh,
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: _EmptyOrdersView(
                title: emptyLabel ?? 'Chưa có đơn hàng nào',
                showShopButton: emptyLabel == null,
                onStartShopping: onStartShopping,
              ),
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: refresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
        itemCount: orders.length,
        separatorBuilder: (context, index) => const SizedBox(height: 10),
        itemBuilder: (context, index) => _OrderCard(order: orders[index]),
      ),
    );
  }
}

class _EmptyOrdersView extends StatelessWidget {
  final String title;
  final bool showShopButton;
  final VoidCallback? onStartShopping;

  const _EmptyOrdersView({required this.title, required this.showShopButton, this.onStartShopping});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.border),
            ),
            child: const Icon(Icons.receipt_long_outlined, size: 48, color: AppColors.navy),
          ),
          const SizedBox(height: 18),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: 'Poppins',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          if (showShopButton) ...[
            const SizedBox(height: 8),
            const Text(
              'Bạn chưa đặt chiếc bánh nào tại The Sweets. Hãy chọn những món bánh thơm ngon ngay nhé!',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13.5, color: AppColors.textSecondary, height: 1.5),
            ),
            const SizedBox(height: 22),
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
        ],
      ),
    );
  }
}

/// Thẻ đơn rút gọn: chỉ hiện món đầu tiên + tổng tiền, bấm vào để xem chi tiết
class _OrderCard extends StatelessWidget {
  final OrderModel order;
  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final code = order.orderCode ?? 'DH${order.orderId}';
    final first = order.details.isNotEmpty ? order.details.first : null;
    final moreCount = order.details.length - 1;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => OrderDetailScreen.open(context, order.orderId),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Mã đơn & trạng thái
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
                child: Row(
                  children: [
                    const Icon(Icons.storefront_outlined, size: 18, color: AppColors.navy),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        '#$code',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: AppColors.navy,
                        ),
                      ),
                    ),
                    OrderStatusBadge(status: order.status),
                  ],
                ),
              ),
              const Divider(height: 1, color: AppColors.cardBorder),

              // Món đầu tiên
              if (first != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: SizedBox(
                          width: 64,
                          height: 64,
                          child: AppImage(
                            imagePath: first.image,
                            fit: BoxFit.cover,
                            placeholder: Container(color: AppColors.surfaceVariant),
                            errorWidget: Container(
                              color: AppColors.primaryLight,
                              child: const Center(
                                child: Icon(Icons.cake_outlined, size: 24, color: AppColors.primary),
                              ),
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
                              first.productName,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'Size: ${first.sizeName}',
                              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'x${first.quantity}',
                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            AppTheme.formatCurrency(first.price),
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

              if (moreCount > 0)
                Padding(
                  padding: const EdgeInsets.only(top: 6, bottom: 2),
                  child: Center(
                    child: Text(
                      'Xem thêm $moreCount sản phẩm',
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ),
                ),

              // Tổng tiền
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text.rich(
                    TextSpan(
                      style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                      children: [
                        TextSpan(text: 'Tổng số tiền (${order.totalQuantity} sản phẩm): '),
                        TextSpan(
                          text: AppTheme.formatCurrency(order.finalCost),
                          style: const TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 14.5,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const Divider(height: 1, color: AppColors.cardBorder),

              // Giờ nhận & lối vào chi tiết
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
                child: Row(
                  children: [
                    const Icon(Icons.access_time_rounded, size: 15, color: AppColors.primary),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Nhận bánh: ${AppDateFormat.dateTime(order.pickupTime)}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ),
                    const Text(
                      'Xem chi tiết',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
                    ),
                    const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.primary),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

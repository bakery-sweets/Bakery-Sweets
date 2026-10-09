import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/screens/login_modal.dart';
import '../providers/cart_provider.dart';
import '../../orders/providers/orders_provider.dart';
import '../../navigation/screens/main_navigation_screen.dart';
import 'package:dio/dio.dart';
import '../../promotions/models/promotion_model.dart';
import '../../promotions/providers/promotions_provider.dart';
import '../../promotions/screens/voucher_selector_modal.dart';

class CheckoutModal extends ConsumerStatefulWidget {
  final double totalAmount;
  const CheckoutModal({super.key, required this.totalAmount});

  static Future<void> show(BuildContext context, double totalAmount, {WidgetRef? ref}) async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CheckoutModal(totalAmount: totalAmount),
    );

    if (result != null && result['success'] == true && context.mounted) {
      final orderCode = result['order_code'] as String;
      final pickupDisplay = result['pickup_display'] as String;
      final paymentMethod = result['payment_method'] as String;
      final finalAmount = result['final_amount'] as double;
      final discountAmount = result['discount_amount'] as double;

      void navigateToOrders() {
        if (ref != null) {
          ref.read(navigationIndexProvider.notifier).setIndex(2);
        } else {
          try {
            ProviderScope.containerOf(context, listen: false)
                .read(navigationIndexProvider.notifier)
                .setIndex(2);
          } catch (_) {}
        }
      }

      // 1. Hiển thị Dialog thông báo thành công kèm nút xem lịch sử
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (dialogCtx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          contentPadding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  color: AppColors.primaryLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 54),
              ),
              const SizedBox(height: 18),
              const Text(
                'Đặt bánh thành công!',
                style: TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.navy,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Mã đơn hàng: #$orderCode',
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 14),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('📍 Địa chỉ: The Sweets Bakery', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.navy)),
                    const SizedBox(height: 4),
                    Text('🕒 Giờ nhận: $pickupDisplay', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    const SizedBox(height: 4),
                    Text('💳 Hình thức: ${paymentMethod == 'COD' ? 'Tiền mặt khi nhận bánh' : 'Chuyển khoản ngân hàng'}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    if (discountAmount > 0) ...[
                      const SizedBox(height: 4),
                      Text('🎟️ Giảm giá voucher: -${AppTheme.formatCurrency(discountAmount)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary)),
                    ],
                    const SizedBox(height: 4),
                    Text('💰 Thanh toán: ${AppTheme.formatCurrency(finalAmount)}', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: AppColors.navy)),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              // Nút ấn qua bên lịch sử xem
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.receipt_long, color: Colors.white, size: 20),
                  onPressed: () {
                    Navigator.pop(dialogCtx);
                    navigateToOrders();
                  },
                  label: const Text(
                    'Xem lịch sử đơn hàng',
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => Navigator.pop(dialogCtx),
                child: const Text('Ở lại giỏ hàng', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
              ),
            ],
          ),
        ),
      );

      // 2. Phát thông báo SnackBar nổi kèm nút [XEM LỊCH SỬ]
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColors.navy,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
          duration: const Duration(seconds: 6),
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: AppColors.success, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Đặt bánh thành công (#$orderCode)',
                  style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          action: SnackBarAction(
            label: 'XEM LỊCH SỬ',
            textColor: AppColors.primaryLight,
            onPressed: navigateToOrders,
          ),
        ),
      );
    }
  }

  @override
  ConsumerState<CheckoutModal> createState() => _CheckoutModalState();
}

class _CheckoutModalState extends ConsumerState<CheckoutModal> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _notesController = TextEditingController();

  String _paymentMethod = 'COD'; // 'COD' hoặc 'Banking'
  DateTime _pickupTime = DateTime.now().add(const Duration(minutes: 45));
  PromotionModel? _selectedPromotion;
  bool _isSubmitting = false;

  double get _discountAmount => _selectedPromotion?.calculateDiscount(widget.totalAmount) ?? 0.0;
  double get _finalAmount => (widget.totalAmount - _discountAmount).clamp(0.0, double.infinity);

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;
    if (user != null) {
      _nameController.text = user.fullName;
      _phoneController.text = user.phone ?? '';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  String _formatWeekday(DateTime dt) {
    const weekdays = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    return weekdays[dt.weekday];
  }

  String _formatPickupDateDisplay(DateTime dt) {
    final now = DateTime.now();
    final isToday = dt.year == now.year && dt.month == now.month && dt.day == now.day;
    final isTomorrow = dt.year == now.year &&
        dt.month == now.month &&
        dt.day == now.add(const Duration(days: 1)).day;
    final weekday = _formatWeekday(dt);
    if (isToday) {
      return 'Hôm nay ($weekday)';
    } else if (isTomorrow) {
      return 'Ngày mai ($weekday)';
    }
    return '$weekday, ${dt.day}/${dt.month}/${dt.year}';
  }

  String _formatPickupTimeOnly(DateTime dt) {
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  String _formatPickupDisplay(DateTime dt) {
    final hourStr = _formatPickupTimeOnly(dt);
    return '${_formatPickupDateDisplay(dt)} lúc $hourStr';
  }

  /// 1. CHỌN NGÀY & THỨ BẰNG BẢNG LỊCH (Material Calendar Grid)
  Future<void> _selectDateFromCalendar({bool autoOpenScrollTime = false}) async {
    final now = DateTime.now();
    final initialDate = _pickupTime.isBefore(now) ? now : _pickupTime;
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: now,
      lastDate: now.add(const Duration(days: 30)),
      locale: const Locale('vi', 'VN'),
      helpText: 'CHỌN NGÀY VÀ THỨ NHẬN BÁNH',
      cancelText: 'HỦY',
      confirmText: 'CHỌN NGÀY',
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: AppColors.navy,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _pickupTime = DateTime(
          picked.year,
          picked.month,
          picked.day,
          _pickupTime.hour,
          _pickupTime.minute,
        );
      });
      // Nếu chọn ngày xong và cần cuộn giờ tiếp theo
      if (autoOpenScrollTime && mounted) {
        await _selectTimeFromScroll();
      }
    }
  }

  /// 2. CUỘN CHỌN GIỜ BẰNG BÁNH XE SCROLL (Cupertino Time Scroll Picker)
  Future<void> _selectTimeFromScroll() async {
    DateTime tempTime = _pickupTime;

    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SizedBox(
          height: 310,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Hủy', style: TextStyle(color: AppColors.textSecondary, fontSize: 15)),
                    ),
                    Column(
                      children: const [
                        Text(
                          'Cuộn chọn giờ nhận bánh',
                          style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 15.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.navy,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Giờ mở cửa tiệm: 07:30 - 21:30',
                          style: TextStyle(fontSize: 11.5, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                    TextButton(
                      onPressed: () {
                        setState(() => _pickupTime = tempTime);
                        Navigator.pop(ctx);
                      },
                      child: const Text(
                        'Xong',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: CupertinoDatePicker(
                  mode: CupertinoDatePickerMode.time,
                  use24hFormat: true,
                  initialDateTime: tempTime,
                  onDateTimeChanged: (newDateTime) {
                    tempTime = DateTime(
                      _pickupTime.year,
                      _pickupTime.month,
                      _pickupTime.day,
                      newDateTime.hour,
                      newDateTime.minute,
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  /// Chọn cả ngày (bằng bảng lịch) rồi tự động cuộn giờ
  Future<void> _selectCustomDateTime() async {
    await _selectDateFromCalendar(autoOpenScrollTime: true);
  }

  Future<void> _handleConfirmOrder() async {
    final auth = ref.read(authProvider);
    if (!auth.isAuthenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng đăng nhập trước khi tiến hành đặt bánh'),
          duration: Duration(seconds: 2),
        ),
      );
      final loggedIn = await LoginModal.show(context);
      if (loggedIn != true || !mounted) return;
    }

    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập họ tên người nhận bánh')),
      );
      return;
    }

    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập số điện thoại liên hệ nhận bánh')),
      );
      return;
    }

    final cartItems = ref.read(cartProvider);
    if (cartItems.isEmpty) return;

    setState(() => _isSubmitting = true);

    try {
      final orderData = {
        'recipient_name': name,
        'recipient_phone': phone,
        'pickup_time': _pickupTime.toIso8601String(),
        'notes': _notesController.text.trim().isNotEmpty ? _notesController.text.trim() : null,
        'payment_method': _paymentMethod,
        'promotion_id': _selectedPromotion?.promotionId,
        'items': cartItems.map((item) => {
          'product_id': item.productId,
          'size_id': item.sizeId,
          'quantity': item.quantity,
          'note': null,
        }).toList(),
      };

      final response = await ApiClient().dio.post('/orders', data: orderData);

      if (response.statusCode == 200 && mounted) {
        final resData = response.data as Map<String, dynamic>;
        final orderCode = resData['order_code'] as String? ?? 'DH${DateTime.now().millisecondsSinceEpoch}';

        ref.read(cartProvider.notifier).clearCart();
        ref.read(ordersProvider.notifier).fetchOrders();
        ref.invalidate(promotionsProvider);

        final result = {
          'success': true,
          'order_code': orderCode,
          'pickup_display': _formatPickupDisplay(_pickupTime),
          'payment_method': _paymentMethod,
          'final_amount': _finalAmount,
          'discount_amount': _discountAmount,
        };

        Navigator.of(context).pop(result);
      }
    } catch (e) {
      if (mounted) {
        String errorMsg = 'Không thể đặt hàng: $e';
        if (e is DioException && e.response?.data != null) {
          final data = e.response!.data;
          if (data is Map && data['detail'] != null) {
            errorMsg = data['detail'].toString();
          }
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Colors.red.shade700,
            content: Text(errorMsg),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Header kéo
          Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 16, 12),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppColors.border, width: 1)),
            ),
            child: Column(
              children: [
                Center(
                  child: Container(
                    width: 38,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.shopping_bag_outlined, color: AppColors.primary, size: 22),
                        SizedBox(width: 8),
                        Text(
                          'Xác nhận đặt hàng (Pick-up)',
                          style: TextStyle(
                            fontSize: 16.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.navy,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: AppColors.textSecondary, size: 20),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Nội dung cuộn
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              children: [
                // 1. THỜI GIAN NHẬN BÁNH TẠI TIỆM (PICK-UP)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Expanded(
                      child: Text(
                        '1. Thời gian lấy bánh (Pick-up)',
                        style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: AppColors.navy),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    InkWell(
                      onTap: _selectCustomDateTime,
                      borderRadius: BorderRadius.circular(6),
                      child: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        child: Text(
                          'Đổi cả hai',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Hai ô chọn riêng biệt: Bảng ngày & thứ VÀ Cuộn giờ
                      Row(
                        children: [
                          // Ô 1: Bảng ngày & thứ
                          Expanded(
                            flex: 3,
                            child: InkWell(
                              onTap: () => _selectDateFromCalendar(autoOpenScrollTime: false),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: const [
                                        Icon(Icons.calendar_month, color: AppColors.primary, size: 15),
                                        SizedBox(width: 4),
                                        Text('Bảng ngày & thứ', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                      ],
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      _formatPickupDateDisplay(_pickupTime),
                                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: AppColors.navy),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Ô 2: Cuộn giờ (scroll)
                          Expanded(
                            flex: 2,
                            child: InkWell(
                              onTap: _selectTimeFromScroll,
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: const [
                                        Icon(Icons.access_time_filled, color: AppColors.primary, size: 15),
                                        SizedBox(width: 4),
                                        Text('Cuộn giờ', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                      ],
                                    ),
                                    const SizedBox(height: 3),
                                    Row(
                                      children: [
                                        Text(
                                          _formatPickupTimeOnly(_pickupTime),
                                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy),
                                        ),
                                        const Spacer(),
                                        const Icon(Icons.unfold_more, size: 16, color: AppColors.textSecondary),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      // Nút chọn nhanh mốc giờ
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        children: [
                          _buildQuickTimeChip('Sau 30 phút', 30),
                          _buildQuickTimeChip('Sau 1 tiếng', 60),
                          _buildQuickTimeChip('Sau 2 tiếng', 120),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 22),

                // 2. HÌNH THỨC THANH TOÁN (COD HOẶC CHUYỂN KHOẢN)
                const Text(
                  '2. Hình thức thanh toán',
                  style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: AppColors.navy),
                ),
                const SizedBox(height: 10),
                _buildPaymentOption(
                  value: 'COD',
                  title: 'Tiền mặt khi nhận bánh (COD)',
                  subtitle: 'Thanh toán trực tiếp bằng tiền mặt khi tới quầy lấy bánh',
                  icon: Icons.payments_outlined,
                ),
                const SizedBox(height: 8),
                _buildPaymentOption(
                  value: 'Banking',
                  title: 'Chuyển khoản ngân hàng (Banking)',
                  subtitle: 'Quét mã QR hoặc chuyển khoản qua STK The Sweets',
                  icon: Icons.account_balance_outlined,
                ),

                // Box thông tin STK ngân hàng khi chọn Banking
                if (_paymentMethod == 'Banking') ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceVariant,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('💳 THÔNG TIN TÀI KHOẢN TIỆM BÁNH:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy)),
                        SizedBox(height: 6),
                        Text('• Ngân hàng: Vietcombank (CN TP.HCM)', style: TextStyle(fontSize: 12.5, color: AppColors.textPrimary)),
                        Text('• Số tài khoản: 0123 4567 8999', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary)),
                        Text('• Chủ tài khoản: TIEM BANH THE SWEETS', style: TextStyle(fontSize: 12.5, color: AppColors.textPrimary)),
                        SizedBox(height: 4),
                        Text('• Nội dung CK: [SĐT của bạn] - Dat banh Sweets', style: TextStyle(fontSize: 11.5, color: AppColors.textSecondary, fontStyle: FontStyle.italic)),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 22),

                // 3. VOUCHER & ƯU ĐÃI
                const Text(
                  '3. Ưu đãi / Voucher',
                  style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: AppColors.navy),
                ),
                const SizedBox(height: 10),
                InkWell(
                  onTap: () async {
                    final picked = await VoucherSelectorModal.show(
                      context,
                      orderTotal: widget.totalAmount,
                      selectedPromotion: _selectedPromotion,
                    );
                    setState(() => _selectedPromotion = picked);
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _selectedPromotion != null
                          ? AppColors.primaryLight.withValues(alpha: 0.35)
                          : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _selectedPromotion != null ? AppColors.primary : AppColors.cardBorder,
                        width: _selectedPromotion != null ? 1.5 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.confirmation_num_outlined, color: AppColors.primary, size: 22),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _selectedPromotion != null
                              ? Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppColors.primary,
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            _selectedPromotion!.promotionCode,
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.white,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          '-${AppTheme.formatCurrency(_discountAmount)}',
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      _selectedPromotion!.promotionName,
                                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                    ),
                                  ],
                                )
                              : const Text(
                                  'Chọn hoặc nhập mã ưu đãi (Voucher)',
                                  style: TextStyle(fontSize: 13.5, color: AppColors.textPrimary, fontWeight: FontWeight.w500),
                                ),
                        ),
                        if (_selectedPromotion != null)
                          IconButton(
                            icon: const Icon(Icons.close, size: 18, color: AppColors.textSecondary),
                            onPressed: () => setState(() => _selectedPromotion = null),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          )
                        else
                          const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textMuted),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 22),

                // 4. THÔNG TIN LIÊN HỆ NGƯỜI NHẬN
                const Text(
                  '4. Thông tin người nhận bánh',
                  style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: AppColors.navy),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _nameController,
                  decoration: InputDecoration(
                    labelText: 'Họ tên người nhận',
                    prefixIcon: const Icon(Icons.person_outline),
                    filled: true,
                    fillColor: AppColors.surfaceVariant,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    labelText: 'Số điện thoại nhận bánh',
                    prefixIcon: const Icon(Icons.phone_outlined),
                    filled: true,
                    fillColor: AppColors.surfaceVariant,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _notesController,
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: 'Ghi chú cho tiệm bánh (tùy chọn)',
                    hintText: 'VD: Viết chữ Happy Birthday, thêm 1 bộ dao nĩa...',
                    prefixIcon: const Icon(Icons.edit_note_rounded),
                    filled: true,
                    fillColor: AppColors.surfaceVariant,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
              ],
            ),
          ),

          // Footer thanh toán & Nút Xác nhận
          Container(
            padding: EdgeInsets.fromLTRB(
              20,
              12,
              20,
              MediaQuery.of(context).viewPadding.bottom + 12,
            ),
            decoration: BoxDecoration(
              color: Colors.white,
              border: const Border(top: BorderSide(color: AppColors.border)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  offset: const Offset(0, -3),
                  blurRadius: 10,
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_selectedPromotion != null) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Tạm tính:', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                      Text(
                        AppTheme.formatCurrency(widget.totalAmount),
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Voucher (${_selectedPromotion!.promotionCode}):', style: const TextStyle(fontSize: 13, color: AppColors.primary)),
                      Text(
                        '-${AppTheme.formatCurrency(_discountAmount)}',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                ],
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Tổng thanh toán:', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                    Text(
                      AppTheme.formatCurrency(_finalAmount),
                      style: const TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: _isSubmitting ? null : _handleConfirmOrder,
                    child: _isSubmitting
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text(
                            'Xác nhận đặt bánh',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickTimeChip(String label, int minutesToAdd) {
    return InkWell(
      onTap: () {
        setState(() {
          _pickupTime = DateTime.now().add(Duration(minutes: minutesToAdd));
        });
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppColors.primary),
        ),
      ),
    );
  }

  Widget _buildPaymentOption({
    required String value,
    required String title,
    required String subtitle,
    required IconData icon,
  }) {
    final isSelected = _paymentMethod == value;
    return InkWell(
      onTap: () => setState(() => _paymentMethod = value),
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryLight.withValues(alpha: 0.4) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.cardBorder,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? AppColors.primary : AppColors.navy, size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                      color: AppColors.navy,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(fontSize: 11.5, color: AppColors.textSecondary)),
                ],
              ),
            ),
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
  }
}

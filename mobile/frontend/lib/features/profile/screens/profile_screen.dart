import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/screens/login_modal.dart';
import '../../promotions/screens/promotions_screen.dart';
import 'edit_profile_modal.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final user = auth.user;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Tài khoản cá nhân'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Thẻ người dùng
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.cardBorder),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              width: double.infinity,
              child: auth.isAuthenticated && user != null
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user.fullName.isNotEmpty ? user.fullName : user.userName,
                                style: const TextStyle(
                                  fontFamily: 'Poppins',
                                  fontSize: 17,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                user.phone?.isNotEmpty == true
                                    ? user.phone!
                                    : (user.email.isNotEmpty ? user.email : '@${user.userName}'),
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Khách hàng The Sweets',
                          style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Đăng nhập để xem lịch sử mua hàng và quản lý tài khoản.',
                          style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(vertical: 11),
                            ),
                            onPressed: () => LoginModal.show(context),
                            icon: const Icon(Icons.login_rounded, size: 18),
                            label: const Text('Đăng nhập / Đăng ký', style: TextStyle(fontWeight: FontWeight.w700)),
                          ),
                        ),
                      ],
                    ),
            ),
            const SizedBox(height: 20),

            // Các mục cài đặt / danh sách thông tin
            _buildSectionTile(
              icon: Icons.person_outline,
              title: 'Cập nhật thông tin tài khoản',
              subtitle: auth.isAuthenticated ? 'Chỉnh sửa họ tên, SĐT, email, giới tính' : null,
              onTap: () {
                if (!auth.isAuthenticated) {
                  LoginModal.show(context);
                } else if (user != null) {
                  EditProfileModal.show(context, user);
                }
              },
            ),
            _buildSectionTile(
              icon: Icons.confirmation_num_outlined,
              title: 'Kho Voucher & Ưu đãi',
              subtitle: 'Xem các mã giảm giá áp dụng khi đặt bánh',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const PromotionsScreen()),
                );
              },
            ),
            _buildSectionTile(
              icon: Icons.access_time_outlined,
              title: 'Giờ mở cửa tiệm bánh (07:30 - 21:30)',
              subtitle: 'Mở cửa phục vụ tất cả các ngày trong tuần',
              showArrow: false,
              onTap: null,
            ),
            _buildSectionTile(
              icon: Icons.support_agent_outlined,
              title: 'Hỗ trợ khách hàng: 1900 6868',
              subtitle: 'Tổng đài chăm sóc khách hàng & tư vấn đặt bánh',
              showArrow: false,
              onTap: null,
            ),
            _buildSectionTile(
              icon: Icons.info_outline,
              title: 'Về The Sweets Bakery',
              subtitle: 'Tiệm bánh thủ công cao cấp chuẩn vị Pháp',
              onTap: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    title: const Text('The Sweets Bakery', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.navy)),
                    content: const Text(
                      'The Sweets là thương hiệu bánh ngọt thủ công cao cấp, chuyên phục vụ các dòng bánh Mousse thanh mát, Bánh sừng bò ngàn lớp thơm bơ Pháp thượng hạng và Trà tươi nguyên bản.',
                      style: TextStyle(fontSize: 13.5, height: 1.5, color: AppColors.textPrimary),
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('Đóng', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                );
              },
            ),

            if (auth.isAuthenticated) ...[
              const SizedBox(height: 10),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: ListTile(
                  leading: const Icon(Icons.logout_rounded, color: AppColors.danger, size: 22),
                  title: const Text(
                    'Đăng xuất tài khoản',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.danger),
                  ),
                  onTap: () {
                    showDialog(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Đăng xuất?'),
                        content: const Text('Bạn có chắc chắn muốn đăng xuất tài khoản không?'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx),
                            child: const Text('Hủy', style: TextStyle(color: AppColors.textSecondary)),
                          ),
                          TextButton(
                            onPressed: () async {
                              Navigator.pop(ctx);
                              await ref.read(authProvider.notifier).logout();
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Đã đăng xuất tài khoản')),
                                );
                              }
                            },
                            child: const Text('Đăng xuất', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTile({
    required IconData icon,
    required String title,
    String? subtitle,
    VoidCallback? onTap,
    bool showArrow = true,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: ListTile(
        leading: Icon(icon, color: AppColors.navy, size: 22),
        title: Text(
          title,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
        ),
        subtitle: subtitle != null
            ? Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary))
            : null,
        trailing: showArrow ? const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textMuted) : null,
        onTap: onTap,
      ),
    );
  }
}

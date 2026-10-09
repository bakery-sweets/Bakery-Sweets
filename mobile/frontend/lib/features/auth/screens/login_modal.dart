import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';

class LoginModal extends ConsumerStatefulWidget {
  final VoidCallback? onLoginSuccess;
  const LoginModal({super.key, this.onLoginSuccess});

  static Future<bool?> show(BuildContext context) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const LoginModal(),
    );
  }

  @override
  ConsumerState<LoginModal> createState() => _LoginModalState();
}

class _LoginModalState extends ConsumerState<LoginModal> {
  bool _isRegister = false;
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _emailController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _fillSampleUser() {
    setState(() {
      _isRegister = false;
      _usernameController.text = 'cus1';
      _passwordController.text = '123';
    });
  }

  Future<void> _submit() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text;

    if (username.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập tên đăng nhập và mật khẩu')),
      );
      return;
    }

    if (_isRegister) {
      final email = _emailController.text.trim();
      final firstName = _firstNameController.text.trim();
      final lastName = _lastNameController.text.trim();
      if (email.isEmpty || firstName.isEmpty || lastName.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Vui lòng điền đủ họ tên và email')),
        );
        return;
      }

      final success = await ref.read(authProvider.notifier).register(
            username: username,
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName,
            phone: _phoneController.text.trim(),
          );
      if (success && mounted) {
        widget.onLoginSuccess?.call();
        Navigator.pop(context, true);
      }
    } else {
      final success = await ref.read(authProvider.notifier).login(username, password);
      if (success && mounted) {
        widget.onLoginSuccess?.call();
        Navigator.pop(context, true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        left: 20,
        right: 20,
        top: 14,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thanh kéo nhỏ
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Tiêu đề & Đóng
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: AppColors.primaryLight,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.lock_person_rounded, color: AppColors.primary, size: 22),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      _isRegister ? 'Tạo tài khoản The Sweets' : 'Đăng nhập tài khoản',
                      style: const TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: AppColors.navy,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppColors.textSecondary),
                  onPressed: () => Navigator.pop(context, false),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              'Đăng nhập để xác thực thông tin đơn hàng và tiếp tục thanh toán.',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),

            if (authState.errorMessage != null)
              Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        authState.errorMessage!,
                        style: const TextStyle(color: Colors.red, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),

            // Chế độ đăng ký: Họ & Tên
            if (_isRegister) ...[
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _firstNameController,
                      decoration: InputDecoration(
                        labelText: 'Họ & đệm',
                        filled: true,
                        fillColor: AppColors.surfaceVariant,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _lastNameController,
                      decoration: InputDecoration(
                        labelText: 'Tên',
                        filled: true,
                        fillColor: AppColors.surfaceVariant,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: 'Email',
                  prefixIcon: const Icon(Icons.email_outlined),
                  filled: true,
                  fillColor: AppColors.surfaceVariant,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: 'Số điện thoại',
                  prefixIcon: const Icon(Icons.phone_outlined),
                  filled: true,
                  fillColor: AppColors.surfaceVariant,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 12),
            ],

            // Tên đăng nhập
            TextField(
              controller: _usernameController,
              decoration: InputDecoration(
                labelText: _isRegister ? 'Tên đăng nhập (username)' : 'Tên đăng nhập hoặc Email',
                prefixIcon: const Icon(Icons.person_outline),
                filled: true,
                fillColor: AppColors.surfaceVariant,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 12),

            // Mật khẩu
            TextField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              decoration: InputDecoration(
                labelText: 'Mật khẩu',
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                ),
                filled: true,
                fillColor: AppColors.surfaceVariant,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),

            // Nút bấm gợi ý tài khoản test nhanh
            if (!_isRegister)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton.icon(
                    onPressed: _fillSampleUser,
                    icon: const Icon(Icons.bolt_rounded, size: 16, color: AppColors.primary),
                    label: const Text('Dùng tài khoản mẫu (cus1)', style: TextStyle(fontSize: 12.5, color: AppColors.primary, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),

            const SizedBox(height: 8),

            // Nút Xác nhận Đăng nhập / Đăng ký
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: authState.isLoading ? null : _submit,
                child: authState.isLoading
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(
                        _isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập ngay',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
              ),
            ),
            const SizedBox(height: 12),

            // Chuyển đổi Đăng nhập <-> Đăng ký
            Center(
              child: TextButton(
                onPressed: () {
                  setState(() {
                    _isRegister = !_isRegister;
                  });
                },
                child: Text(
                  _isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký ngay',
                  style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

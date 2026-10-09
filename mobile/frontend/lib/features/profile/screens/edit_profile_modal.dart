import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/models/user_model.dart';
import '../../auth/providers/auth_provider.dart';

class EditProfileModal extends ConsumerStatefulWidget {
  final UserModel user;
  const EditProfileModal({super.key, required this.user});

  static Future<bool?> show(BuildContext context, UserModel user) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => EditProfileModal(user: user),
    );
  }

  @override
  ConsumerState<EditProfileModal> createState() => _EditProfileModalState();
}

class _EditProfileModalState extends ConsumerState<EditProfileModal> {
  late final TextEditingController _firstNameController;
  late final TextEditingController _lastNameController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late String _selectedGender;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _firstNameController = TextEditingController(text: widget.user.firstName ?? '');
    _lastNameController = TextEditingController(text: widget.user.lastName ?? '');
    _emailController = TextEditingController(text: widget.user.email);
    _phoneController = TextEditingController(text: widget.user.phone ?? '');
    _selectedGender = widget.user.gender ?? 'Other';
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();

    if (firstName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập tên của bạn')),
      );
      return;
    }

    if (email.isEmpty || !email.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập địa chỉ email hợp lệ')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final success = await ref.read(authProvider.notifier).updateProfile(
          firstName: firstName,
          lastName: lastName,
          phone: phone.isNotEmpty ? phone : null,
          gender: _selectedGender,
          email: email,
        );

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.navy,
            behavior: SnackBarBehavior.floating,
            content: Row(
              children: [
                Icon(Icons.check_circle, color: AppColors.success, size: 20),
                SizedBox(width: 10),
                Text('Cập nhật thông tin tài khoản thành công!'),
              ],
            ),
          ),
        );
      } else {
        final err = ref.read(authProvider).errorMessage ?? 'Cập nhật thất bại';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Colors.red.shade700,
            content: Text(err),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Thanh kéo drag handle
              Center(
                child: Container(
                  width: 44,
                  height: 4.5,
                  decoration: BoxDecoration(
                    color: AppColors.inputBorder,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Tiêu đề
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Cập nhật thông tin',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 22, color: AppColors.textSecondary),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Tên đăng nhập (Read-only)
              _buildReadOnlyField(
                label: 'Tên đăng nhập',
                value: widget.user.userName,
                icon: Icons.person_pin_outlined,
              ),
              const SizedBox(height: 12),

              // Họ & Tên
              Row(
                children: [
                  Expanded(
                    flex: 1,
                    child: _buildTextField(
                      controller: _lastNameController,
                      label: 'Họ & tên đệm',
                      hint: 'Nguyễn Văn',
                      icon: Icons.badge_outlined,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 1,
                    child: _buildTextField(
                      controller: _firstNameController,
                      label: 'Tên',
                      hint: 'An',
                      icon: Icons.person_outline,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Email
              _buildTextField(
                controller: _emailController,
                label: 'Email liên hệ',
                hint: 'example@gmail.com',
                icon: Icons.email_outlined,
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 12),

              // Số điện thoại
              _buildTextField(
                controller: _phoneController,
                label: 'Số điện thoại',
                hint: '0901234567',
                icon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 14),

              // Giới tính
              const Text(
                'Giới tính',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.navy),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildGenderChip('Nam', 'Male'),
                  const SizedBox(width: 10),
                  _buildGenderChip('Nữ', 'Female'),
                  const SizedBox(width: 10),
                  _buildGenderChip('Khác', 'Other'),
                ],
              ),
              const SizedBox(height: 24),

              // Nút bấm lưu
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _isSubmitting ? null : _handleSubmit,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text(
                          'Lưu thay đổi',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReadOnlyField({
    required String label,
    required String value,
    required IconData icon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.surfaceVariant,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Icon(icon, size: 20, color: AppColors.textMuted),
              const SizedBox(width: 10),
              Text(
                value,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.navy),
              ),
              const Spacer(),
              const Icon(Icons.lock_outline, size: 16, color: AppColors.textMuted),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.navy),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          style: const TextStyle(fontSize: 14, color: AppColors.textPrimary),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(fontSize: 13, color: AppColors.textMuted),
            prefixIcon: Icon(icon, size: 20, color: AppColors.primary),
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.inputBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGenderChip(String label, String value) {
    final isSelected = _selectedGender == value;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedGender = value),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primaryLight : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.inputBorder,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? AppColors.primary : AppColors.textPrimary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

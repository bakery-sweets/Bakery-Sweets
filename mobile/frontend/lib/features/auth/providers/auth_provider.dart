import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/network/api_client.dart';
import '../models/user_model.dart';

class AuthState {
  final UserModel? user;
  final bool isLoading;
  final String? errorMessage;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.errorMessage,
  });

  bool get isAuthenticated => user != null;

  AuthState copyWith({
    UserModel? user,
    bool? isLoading,
    String? errorMessage,
    bool clearUser = false,
    bool clearError = false,
  }) {
    return AuthState(
      user: clearUser ? null : (user ?? this.user),
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  final _storage = const FlutterSecureStorage();

  @override
  AuthState build() {
    // Tự động kiểm tra phiên đăng nhập nền
    Future.microtask(() => checkAuthStatus());
    return const AuthState();
  }

  Future<void> checkAuthStatus() async {
    try {
      final token = await _storage.read(key: 'access_token');
      if (token == null || token.isEmpty) {
        state = state.copyWith(clearUser: true);
        return;
      }

      final response = await ApiClient().dio.get('/auth/me');
      if (response.statusCode == 200 && response.data != null) {
        final user = UserModel.fromJson(response.data as Map<String, dynamic>);
        state = state.copyWith(user: user, clearError: true);
      }
    } catch (_) {
      // Token hết hạn hoặc không hợp lệ
      await _storage.delete(key: 'access_token');
      state = state.copyWith(clearUser: true);
    }
  }

  Future<bool> login(String username, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await ApiClient().dio.post(
        '/auth/login',
        data: {
          'user_name': username.trim(),
          'password': password,
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        final token = data['access_token'] as String;
        final userJson = data['user'] as Map<String, dynamic>;
        final user = UserModel.fromJson(userJson);

        await _storage.write(key: 'access_token', value: token);
        state = state.copyWith(user: user, isLoading: false, clearError: true);
        return true;
      }
    } catch (e) {
      String msg = 'Đăng nhập không thành công';
      if (e.toString().contains('401') || e.toString().contains('không chính xác')) {
        msg = 'Sai tên đăng nhập hoặc mật khẩu';
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      if (kDebugMode) {
        debugPrint('[Login Error] $e');
      }
    }
    return false;
  }

  Future<bool> register({
    required String username,
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await ApiClient().dio.post(
        '/auth/register',
        data: {
          'user_name': username.trim(),
          'email': email.trim(),
          'password': password,
          'first_name': firstName.trim(),
          'last_name': lastName.trim(),
          'phone': phone?.trim(),
          'gender': 'Other',
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        final token = data['access_token'] as String;
        final userJson = data['user'] as Map<String, dynamic>;
        final user = UserModel.fromJson(userJson);

        await _storage.write(key: 'access_token', value: token);
        state = state.copyWith(user: user, isLoading: false, clearError: true);
        return true;
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Đăng ký thất bại. Tên đăng nhập hoặc email đã tồn tại.',
      );
    }
    return false;
  }

  Future<bool> updateProfile({
    required String firstName,
    required String lastName,
    String? phone,
    String? gender,
    String? email,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await ApiClient().dio.put(
        '/auth/profile',
        data: {
          'first_name': firstName.trim(),
          'last_name': lastName.trim(),
          'phone': phone?.trim(),
          'gender': gender ?? 'Other',
          if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final user = UserModel.fromJson(response.data as Map<String, dynamic>);
        state = state.copyWith(user: user, isLoading: false, clearError: true);
        return true;
      }
    } catch (e) {
      String msg = 'Cập nhật thông tin thất bại';
      if (e.toString().contains('Email')) {
        msg = 'Email này đã được sử dụng bởi tài khoản khác';
      } else if (e.toString().contains('thoại')) {
        msg = 'Số điện thoại này đã được sử dụng';
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
    }
    return false;
  }

  Future<void> logout() async {
    await _storage.delete(key: 'access_token');
    state = const AuthState();
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

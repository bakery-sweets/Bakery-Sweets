import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../models/user_model.dart';

class AuthState {
  final UserModel? user;
  final bool isLoading;
  final String? errorMessage;
  // Lý do bị đăng xuất cưỡng bức (tài khoản bị khóa từ trang quản trị), giao diện đọc để thông báo
  final String? forcedLogoutReason;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.errorMessage,
    this.forcedLogoutReason,
  });

  bool get isAuthenticated => user != null;

  AuthState copyWith({
    UserModel? user,
    bool? isLoading,
    String? errorMessage,
    bool clearUser = false,
    bool clearError = false,
    bool clearForcedLogout = false,
  }) {
    return AuthState(
      user: clearUser ? null : (user ?? this.user),
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      forcedLogoutReason: clearForcedLogout ? null : forcedLogoutReason,
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
      // Server trả câu báo cụ thể: sai mật khẩu (401) hoặc tài khoản bị khóa (403)
      final msg = ApiException.from(e, 'Đăng nhập không thành công, vui lòng thử lại').message;
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
        errorMessage: ApiException.from(e, 'Đăng ký thất bại, vui lòng thử lại').message,
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
      final msg = ApiException.from(e, 'Cập nhật thông tin thất bại').message;
      state = state.copyWith(isLoading: false, errorMessage: msg);
    }
    return false;
  }

  Future<void> logout() async {
    await _storage.delete(key: 'access_token');
    state = const AuthState();
  }

  /// Tài khoản vừa bị khóa (nhận qua realtime): xóa phiên ngay và giữ lại lý do để hiển thị
  Future<void> forceLogout(String? reason) async {
    await _storage.delete(key: 'access_token');
    state = AuthState(forcedLogoutReason: reason ?? 'Tài khoản của bạn đã bị khóa');
  }

  void clearForcedLogoutReason() {
    state = state.copyWith(clearForcedLogout: true);
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

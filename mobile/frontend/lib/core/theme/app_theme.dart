import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class AppColors {
  // Brand Colors (Rút trích chuẩn xác từ web The Sweets)
  static const Color primary = Color(0xFFD4845A);       // Cam đất / Warm Terracotta
  static const Color primaryDark = Color(0xFFB5623A);   // Burnt Caramel / Hover CTA
  static const Color primaryLight = Color(0xFFFDF5F0);  // Nền kem ấm (warm tint)
  
  static const Color navy = Color(0xFF1A2639);          // Xanh đen / Deep Slate Navy
  static const Color darkBg = Color(0xFF1A1A2E);        // Nền tối / Midnight
  static const Color footerBg = Color(0xFF212121);      // Xám đen Footer
  
  // Pastel & Accent Colors
  static const Color iceBlue = Color(0xFFCADBFB);       // Xanh phấn Pastel
  static const Color iceBlueBorder = Color(0xFF8BB4F7); // Viền xanh mềm
  static const Color pinkAccent = Color(0xFFED8A9F);    // Hồng dâu nhạt
  static const Color softPink = Color(0xFFF5D7D7);      // Nền icon hồng phấn
  
  // Neutral Colors
  static const Color background = Color(0xFFFFFFFF);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFF1F5F9);
  static const Color border = Color(0xFFE2E8F0);
  static const Color inputBorder = Color(0xFFCBD5E1);
  
  // Typography Colors
  static const Color textPrimary = Color(0xFF1E293B);   // Slate 800
  static const Color textSecondary = Color(0xFF64748B); // Slate 500
  static const Color textMuted = Color(0xFF94A3B8);     // Slate 400
  static const Color textLight = Color(0xFFFFFFFF);
  
  // Status Colors
  static const Color success = Color(0xFF10B981);       // Xanh lá thành công
  static const Color successBg = Color(0xFFDEF7EC);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningBg = Color(0xFFFEF08A);
  static const Color danger = Color(0xFFEF4444);        // Đỏ hủy / xóa
  static const Color dangerBg = Color(0xFFFDE8E8);
}

class AppTheme {
  static final NumberFormat _currencyFormat = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: 'đ',
    decimalDigits: 0,
  );

  static String formatCurrency(num amount) {
    return _currencyFormat.format(amount).trim();
  }

  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: AppColors.background,
    fontFamily: 'Poppins',
    colorScheme: const ColorScheme.light(
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.navy,
      onSecondary: Colors.white,
      surface: AppColors.surface,
      onSurface: AppColors.textPrimary,
      error: AppColors.danger,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: AppColors.navy,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        fontFamily: 'Poppins',
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: AppColors.navy,
      ),
      iconTheme: IconThemeData(color: AppColors.navy),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
        textStyle: const TextStyle(
          fontFamily: 'Poppins',
          fontSize: 15,
          fontWeight: FontWeight.w700,
        ),
      ),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.cardBorder, width: 1),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: AppColors.textMuted,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
      selectedLabelStyle: TextStyle(
        fontFamily: 'Poppins',
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
      unselectedLabelStyle: TextStyle(
        fontFamily: 'Poppins',
        fontSize: 12,
        fontWeight: FontWeight.w500,
      ),
    ),
  );
}

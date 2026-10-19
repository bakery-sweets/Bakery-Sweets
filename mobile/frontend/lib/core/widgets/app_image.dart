import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../theme/app_theme.dart';
import '../config/app_config.dart';

class AppImage extends StatelessWidget {
  final String? imageUrl;
  final String? imagePath;
  final double? width;
  final double? height;
  final BoxFit fit;
  final double borderRadius;
  final Widget? placeholder;
  final Widget? errorWidget;

  const AppImage({
    super.key,
    this.imageUrl,
    this.imagePath,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius = 0,
    this.placeholder,
    this.errorWidget,
  });

  @override
  Widget build(BuildContext context) {
    final effectivePath = imagePath ?? imageUrl;
    if (effectivePath == null || effectivePath.trim().isEmpty) {
      return _buildFallback();
    }

    var path = effectivePath.trim();
    // Tự động chuyển đường dẫn /uploads/... trên server thành URL HTTP hoàn chỉnh
    if (path.startsWith('/uploads/') || path.startsWith('uploads/')) {
      final cleanPath = path.startsWith('/') ? path : '/$path';
      path = '${AppConfig.baseUrl}$cleanPath';
    }

    final isNetwork = path.startsWith('http://') || path.startsWith('https://');

    Widget image;
    if (isNetwork) {
      image = CachedNetworkImage(
        imageUrl: path,
        width: width,
        height: height,
        fit: fit,
        placeholder: (ctx, url) =>
            placeholder ??
            Container(
              width: width,
              height: height,
              color: AppColors.surfaceVariant,
              child: const Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                ),
              ),
            ),
        errorWidget: (ctx, url, err) => errorWidget ?? _buildFallback(),
      );
    } else {
      String assetPath = path;
      if (!assetPath.startsWith('assets/')) {
        assetPath = 'assets/Img/$path';
      }
      image = Image.asset(
        assetPath,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (ctx, err, stack) => errorWidget ?? _buildFallback(),
      );
    }

    if (borderRadius > 0) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: image,
      );
    }
    return image;
  }

  Widget _buildFallback() {
    return Container(
      width: width,
      height: height,
      color: AppColors.primaryLight,
      child: const Center(
        child: Text('🧁', style: TextStyle(fontSize: 28)),
      ),
    );
  }
}

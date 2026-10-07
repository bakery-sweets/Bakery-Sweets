import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/theme/app_theme.dart';
import 'features/navigation/screens/main_navigation_screen.dart';
import 'features/products/screens/product_detail_screen.dart';

// ─── GoRouter Configuration ───────────────────────────────────────────────────
final _router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (ctx, state) => const MainNavigationScreen(),
    ),
    GoRoute(
      path: '/product/:id',
      builder: (ctx, state) {
        final id = int.tryParse(state.pathParameters['id'] ?? '1') ?? 1;
        return ProductDetailScreen(productId: id);
      },
    ),
  ],
);

// ─── App Entry Point ──────────────────────────────────────────────────────────
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: TheSweetsApp(),
    ),
  );
}

class TheSweetsApp extends StatelessWidget {
  const TheSweetsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'The Sweets — Bakery & Cafe',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: _router,
    );
  }
}

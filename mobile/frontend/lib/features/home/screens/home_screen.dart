import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_image.dart';
import '../../../core/widgets/no_internet_widget.dart';
import '../../products/models/product_model.dart';
import '../../products/providers/product_provider.dart';
import '../../products/screens/product_detail_screen.dart';
import '../../notifications/providers/notifications_provider.dart';

class HomeScreen extends ConsumerStatefulWidget {
  final Function(int)? onNavigateTab;
  const HomeScreen({super.key, this.onNavigateTab});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final PageController _bannerController = PageController();
  final TextEditingController _searchController = TextEditingController();
  int _currentBannerIndex = 0;

  final List<String> _banners = [
    '/uploads/banner1.jpg',
    '/uploads/banner2.jpg',
    '/uploads/Mousse/Tiramisu_Mousse.jpg',
  ];

  @override
  void dispose() {
    _bannerController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(productsProvider);
    final categoriesAsync = ref.watch(categoriesProvider);
    final filter = ref.watch(productFilterProvider);
    final filteredProductsAsync = ref.watch(filteredProductsProvider);
    final notifsState = ref.watch(notificationsProvider);
    final unreadCount = notifsState.unreadCount;

    // Lắng nghe thông báo thời gian thực từ WebSocket
    ref.listen(notificationsProvider, (prev, next) {
      if (next.lastRealtimeAlert != null && next.lastRealtimeAlert != prev?.lastRealtimeAlert) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.navy,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            content: Row(
              children: [
                const Icon(Icons.notifications_active, color: AppColors.primary, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    next.lastRealtimeAlert!,
                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            duration: const Duration(seconds: 4),
          ),
        );
        ref.read(notificationsProvider.notifier).clearAlert();
      }
    });

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            Image.asset(
              'assets/Img/Sweets.png',
              height: 42,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) => Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text('🧁', style: TextStyle(fontSize: 20)),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'The Sweets',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.navy,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Nút Thông báo với chuông và số đếm unread
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined, color: AppColors.navy, size: 26),
                tooltip: 'Thông báo',
                onPressed: () => _showNotificationsModal(context),
              ),
              if (unreadCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      unreadCount > 9 ? '9+' : '$unreadCount',
                      style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: productsAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (error, stackTrace) => RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            ref.invalidate(productsProvider);
            ref.invalidate(categoriesProvider);
          },
          child: NoInternetWidget(
            onRetry: () {
              ref.invalidate(productsProvider);
              ref.invalidate(categoriesProvider);
            },
          ),
        ),
        data: (_) => RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            ref.invalidate(productsProvider);
            ref.invalidate(categoriesProvider);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 24),
            child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. THANH TÌM KIẾM & NÚT BỘ LỌC
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 44,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceVariant,
                          borderRadius: BorderRadius.circular(22),
                          border: Border.all(
                            color: filter.searchQuery.isNotEmpty ? AppColors.primary : AppColors.inputBorder,
                            width: filter.searchQuery.isNotEmpty ? 1.4 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.search, color: AppColors.textSecondary, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                controller: _searchController,
                                onChanged: (val) {
                                  ref.read(productFilterProvider.notifier).setSearchQuery(val);
                                },
                                decoration: const InputDecoration(
                                  hintText: 'Tìm bánh mousse, croissant...',
                                  hintStyle: TextStyle(fontSize: 13, color: AppColors.textMuted),
                                  border: InputBorder.none,
                                  isDense: true,
                                  contentPadding: EdgeInsets.zero,
                                ),
                                style: const TextStyle(fontSize: 13.5, color: AppColors.navy),
                              ),
                            ),
                            if (_searchController.text.isNotEmpty)
                              GestureDetector(
                                onTap: () {
                                  _searchController.clear();
                                  ref.read(productFilterProvider.notifier).setSearchQuery('');
                                },
                                child: const Icon(Icons.close, size: 18, color: AppColors.textSecondary),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // 2. BANNER CAROUSEL (Chiều cao 180px gọn gàng trên mobile như web)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: Column(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: SizedBox(
                        height: 175,
                        width: double.infinity,
                        child: PageView.builder(
                          controller: _bannerController,
                          itemCount: _banners.length,
                          onPageChanged: (idx) {
                            setState(() => _currentBannerIndex = idx);
                          },
                          itemBuilder: (context, index) {
                            return Stack(
                              fit: StackFit.expand,
                              children: [
                                AppImage(
                                  imagePath: _banners[index],
                                  fit: BoxFit.cover,
                                ),
                                // Gradient che chữ sang trọng
                                Container(
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      begin: Alignment.topCenter,
                                      end: Alignment.bottomCenter,
                                      colors: [
                                        Colors.transparent,
                                        Colors.black.withValues(alpha: 0.55),
                                      ],
                                    ),
                                  ),
                                ),
                                Positioned(
                                  left: 16,
                                  bottom: 16,
                                  right: 16,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: const [
                                      Text(
                                        'THE SWEETS BAKERY',
                                        style: TextStyle(
                                          color: AppColors.primary,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 1.2,
                                        ),
                                      ),
                                      SizedBox(height: 2),
                                      Text(
                                        'Bánh tươi nướng mỗi ngày 🥖',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Indicator chấm tròn
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(
                        _banners.length,
                        (index) => Container(
                          width: _currentBannerIndex == index ? 18 : 6,
                          height: 6,
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          decoration: BoxDecoration(
                            color: _currentBannerIndex == index
                                ? AppColors.primary
                                : AppColors.border,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // 3. DANH MỤC SẢN PHẨM (Style tab gợn nhẹ như web)
              categoriesAsync.when(
                data: (categories) => SizedBox(
                  height: 40,
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    scrollDirection: Axis.horizontal,
                    itemCount: categories.length,
                    separatorBuilder: (context, index) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final cat = categories[index];
                      final isSelected = filter.category == cat.categoryName;
                      return GestureDetector(
                        onTap: () {
                          ref.read(productFilterProvider.notifier).setCategory(cat.categoryName);
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.primaryLight : AppColors.surfaceVariant,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isSelected ? AppColors.primary : AppColors.border,
                              width: isSelected ? 1.5 : 1,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              cat.categoryName,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                color: isSelected ? AppColors.primary : AppColors.navy,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                loading: () => const SizedBox(height: 40),
                error: (error, stackTrace) => const SizedBox.shrink(),
              ),

              const SizedBox(height: 16),

              // 4. THANH TÌM KIẾM NÂNG CAO & KẾT QUẢ
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Text(
                              filter.category == 'Tất cả' ? 'Thực đơn bánh' : filter.category,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.navy,
                              ),
                            ),
                            const SizedBox(width: 6),
                            filteredProductsAsync.maybeWhen(
                              data: (products) => Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceVariant,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: Text(
                                  '${products.length}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ),
                              orElse: () => const SizedBox.shrink(),
                            ),
                          ],
                        ),

                        // Nút Tìm kiếm nâng cao
                        InkWell(
                          onTap: () => _openAdvancedFilterModal(context),
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                            decoration: BoxDecoration(
                              color: filter.hasActiveFilter ? AppColors.primaryLight : Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: filter.hasActiveFilter ? AppColors.primary : AppColors.border,
                                width: filter.hasActiveFilter ? 1.4 : 1,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.03),
                                  blurRadius: 4,
                                  offset: const Offset(0, 1),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.tune_rounded,
                                  size: 15,
                                  color: filter.hasActiveFilter ? AppColors.primary : AppColors.textPrimary,
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  'Lọc nâng cao',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: filter.hasActiveFilter ? FontWeight.w700 : FontWeight.w600,
                                    color: filter.hasActiveFilter ? AppColors.primary : AppColors.textPrimary,
                                  ),
                                ),
                                if (filter.activeFilterCount > 0) ...[
                                  const SizedBox(width: 5),
                                  Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(
                                      color: AppColors.primary,
                                      shape: BoxShape.circle,
                                    ),
                                    child: Text(
                                      '${filter.activeFilterCount}',
                                      style: const TextStyle(
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),

                    // Hàng Active Filter Chips (khi có bộ lọc áp dụng)
                    if (filter.hasActiveFilter) ...[
                      const SizedBox(height: 10),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            if (filter.selectedSize != 'Tất cả')
                              _buildActiveFilterTag(
                                label: 'Size: ${filter.selectedSize}',
                                onRemove: () => ref.read(productFilterProvider.notifier).setSize('Tất cả'),
                              ),
                            if (filter.minPrice > 0 || filter.maxPrice < 300000)
                              _buildActiveFilterTag(
                                label: 'Giá: ${AppTheme.formatCurrency(filter.minPrice)} - ${AppTheme.formatCurrency(filter.maxPrice)}',
                                onRemove: () => ref.read(productFilterProvider.notifier).setPriceRange(0, 300000),
                              ),
                            if (filter.sortBy != 'default')
                              _buildActiveFilterTag(
                                label: filter.sortBy == 'price_asc' ? 'Giá tăng dần' : 'Giá giảm dần',
                                onRemove: () => ref.read(productFilterProvider.notifier).setSortBy('default'),
                              ),
                            _buildActiveFilterTag(
                              label: 'Xóa lọc',
                              isClearAll: true,
                              onRemove: () {
                                _searchController.clear();
                                ref.read(productFilterProvider.notifier).reset();
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // 5. LƯỚI SẢN PHẨM (2 CỘT CHUẨN GIAO DIỆN MOBILE WEB)
              filteredProductsAsync.when(
                data: (products) {
                  if (products.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      alignment: Alignment.center,
                      child: Column(
                        children: const [
                          Icon(Icons.search_off, size: 48, color: AppColors.textMuted),
                          SizedBox(height: 10),
                          Text('Không tìm thấy sản phẩm bánh nào!', style: TextStyle(color: AppColors.textSecondary)),
                        ],
                      ),
                    );
                  }

                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: GridView.builder(
                      physics: const NeverScrollableScrollPhysics(),
                      shrinkWrap: true,
                      itemCount: products.length,
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.72, // Tỉ lệ thẻ bánh cân đối
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 14,
                      ),
                      itemBuilder: (context, index) {
                        final product = products[index];
                        return _ProductCard(
                          product: product,
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ProductDetailScreen(productId: product.productId),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  );
                },
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40.0),
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                ),
                error: (err, _) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Text('Lỗi tải sản phẩm: $err'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
  }

  Widget _buildActiveFilterTag({
    required String label,
    required VoidCallback onRemove,
    bool isClearAll = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: isClearAll ? AppColors.surfaceVariant : AppColors.primaryLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isClearAll ? AppColors.border : AppColors.primary.withValues(alpha: 0.4),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: isClearAll ? AppColors.textSecondary : AppColors.primary,
            ),
          ),
          const SizedBox(width: 4),
          GestureDetector(
            onTap: onRemove,
            child: Icon(
              isClearAll ? Icons.refresh_rounded : Icons.close_rounded,
              size: 13,
              color: isClearAll ? AppColors.textSecondary : AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  void _openAdvancedFilterModal(BuildContext context) {
    final currentFilter = ref.read(productFilterProvider);
    final categoriesAsync = ref.read(categoriesProvider);

    // Trạng thái tạm thời trong modal trước khi bấm áp dụng
    String tempCategory = currentFilter.category;
    String tempSize = currentFilter.selectedSize;
    RangeValues tempPriceRange = RangeValues(
      currentFilter.minPrice,
      currentFilter.maxPrice.clamp(currentFilter.minPrice, 300000.0),
    );
    String tempSortBy = currentFilter.sortBy;

    const availableSizes = [
      'Tất cả',
      'Size S',
      'Size M',
      'Size L',
      'Tiêu chuẩn',
      'Ly lớn 500ml',
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bottomSheetContext) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              height: MediaQuery.of(context).size.height * 0.82,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  // Thanh Header kéo & Tiêu đề
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
                                Icon(Icons.tune_rounded, color: AppColors.primary, size: 22),
                                SizedBox(width: 8),
                                Text(
                                  'Bộ lọc & Tìm kiếm nâng cao',
                                  style: TextStyle(
                                    fontSize: 16.5,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.navy,
                                  ),
                                ),
                              ],
                            ),
                            TextButton(
                              onPressed: () {
                                setModalState(() {
                                  tempCategory = 'Tất cả';
                                  tempSize = 'Tất cả';
                                  tempPriceRange = const RangeValues(0, 300000);
                                  tempSortBy = 'default';
                                });
                              },
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: const Text(
                                'Đặt lại',
                                style: TextStyle(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Nội dung các tùy chọn lọc
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                      children: [
                        // 1. KÍCH CỠ BÁNH (SIZE)
                        const Text(
                          'Kích cỡ bánh / Quy cách',
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.navy,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: availableSizes.map((sz) {
                            final isSelected = tempSize == sz;
                            return ChoiceChip(
                              label: Text(sz),
                              selected: isSelected,
                              selectedColor: AppColors.primaryLight,
                              backgroundColor: AppColors.surfaceVariant,
                              labelStyle: TextStyle(
                                fontSize: 12.5,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                color: isSelected ? AppColors.primary : AppColors.textPrimary,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(18),
                                side: BorderSide(
                                  color: isSelected ? AppColors.primary : AppColors.border,
                                  width: isSelected ? 1.5 : 1,
                                ),
                              ),
                              showCheckmark: false,
                              onSelected: (_) {
                                setModalState(() => tempSize = sz);
                              },
                            );
                          }).toList(),
                        ),

                        const SizedBox(height: 22),

                        // 2. MỨC GIÁ TIỀN (TỪ ĐÂU TỚI ĐÂU)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Mức giá',
                              style: TextStyle(
                                fontSize: 14.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.navy,
                              ),
                            ),
                            Text(
                              '${AppTheme.formatCurrency(tempPriceRange.start)} - ${AppTheme.formatCurrency(tempPriceRange.end)}',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        // RangeSlider cho phép kéo chọn linh hoạt từ min đến max
                        RangeSlider(
                          values: tempPriceRange,
                          min: 0,
                          max: 300000,
                          divisions: 30,
                          activeColor: AppColors.primary,
                          inactiveColor: AppColors.border,
                          labels: RangeLabels(
                            AppTheme.formatCurrency(tempPriceRange.start),
                            AppTheme.formatCurrency(tempPriceRange.end),
                          ),
                          onChanged: (values) {
                            setModalState(() {
                              tempPriceRange = values;
                            });
                          },
                        ),

                        // Nút chọn nhanh khoảng giá
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _buildQuickPricePill(
                              label: 'Dưới 50k',
                              isSelected: tempPriceRange.start == 0 && tempPriceRange.end == 50000,
                              onTap: () {
                                setModalState(() {
                                  tempPriceRange = const RangeValues(0, 50000);
                                });
                              },
                            ),
                            _buildQuickPricePill(
                              label: '50k - 150k',
                              isSelected: tempPriceRange.start == 50000 && tempPriceRange.end == 150000,
                              onTap: () {
                                setModalState(() {
                                  tempPriceRange = const RangeValues(50000, 150000);
                                });
                              },
                            ),
                            _buildQuickPricePill(
                              label: '150k - 300k',
                              isSelected: tempPriceRange.start == 150000 && tempPriceRange.end == 300000,
                              onTap: () {
                                setModalState(() {
                                  tempPriceRange = const RangeValues(150000, 300000);
                                });
                              },
                            ),
                            _buildQuickPricePill(
                              label: 'Tất cả mức giá',
                              isSelected: tempPriceRange.start == 0 && tempPriceRange.end == 300000,
                              onTap: () {
                                setModalState(() {
                                  tempPriceRange = const RangeValues(0, 300000);
                                });
                              },
                            ),
                          ],
                        ),

                        const SizedBox(height: 22),

                        // 3. SẮP XẾP THEO GIÁ
                        const Text(
                          'Sắp xếp theo giá',
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.navy,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _buildSortOptionChip(
                              label: 'Mặc định',
                              isSelected: tempSortBy == 'default',
                              onSelected: () => setModalState(() => tempSortBy = 'default'),
                            ),
                            _buildSortOptionChip(
                              label: 'Giá tăng dần (Thấp -> Cao)',
                              isSelected: tempSortBy == 'price_asc',
                              icon: Icons.arrow_upward_rounded,
                              onSelected: () => setModalState(() => tempSortBy = 'price_asc'),
                            ),
                            _buildSortOptionChip(
                              label: 'Giá giảm dần (Cao -> Thấp)',
                              isSelected: tempSortBy == 'price_desc',
                              icon: Icons.arrow_downward_rounded,
                              onSelected: () => setModalState(() => tempSortBy = 'price_desc'),
                            ),
                          ],
                        ),

                        const SizedBox(height: 22),

                        // 4. DANH MỤC SẢN PHẨM
                        const Text(
                          'Danh mục',
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.navy,
                          ),
                        ),
                        const SizedBox(height: 10),
                        categoriesAsync.maybeWhen(
                          data: (categories) => Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: categories.map((cat) {
                              final isSelected = tempCategory == cat.categoryName;
                              return ChoiceChip(
                                label: Text(cat.categoryName),
                                selected: isSelected,
                                selectedColor: AppColors.primaryLight,
                                backgroundColor: AppColors.surfaceVariant,
                                labelStyle: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                  color: isSelected ? AppColors.primary : AppColors.textPrimary,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(18),
                                  side: BorderSide(
                                    color: isSelected ? AppColors.primary : AppColors.border,
                                    width: isSelected ? 1.5 : 1,
                                  ),
                                ),
                                showCheckmark: false,
                                onSelected: (_) {
                                  setModalState(() => tempCategory = cat.categoryName);
                                },
                              );
                            }).toList(),
                          ),
                          orElse: () => const SizedBox.shrink(),
                        ),
                      ],
                    ),
                  ),

                  // Nút Áp dụng bộ lọc cố định ở chân modal
                  Container(
                    padding: EdgeInsets.fromLTRB(
                      16,
                      12,
                      16,
                      MediaQuery.of(context).viewPadding.bottom + 12,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: const Border(top: BorderSide(color: AppColors.border)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          offset: const Offset(0, -3),
                          blurRadius: 8,
                        ),
                      ],
                    ),
                    child: SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: () {
                          ref.read(productFilterProvider.notifier).applyAdvancedFilter(
                            category: tempCategory,
                            selectedSize: tempSize,
                            minPrice: tempPriceRange.start,
                            maxPrice: tempPriceRange.end,
                            sortBy: tempSortBy,
                          );
                          Navigator.pop(context);
                        },
                        child: const Text(
                          'Áp dụng bộ lọc',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildQuickPricePill({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryLight : AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 1.4 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? AppColors.primary : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }

  Widget _buildSortOptionChip({
    required String label,
    required bool isSelected,
    required VoidCallback onSelected,
    IconData? icon,
  }) {
    return ChoiceChip(
      avatar: icon != null
          ? Icon(
              icon,
              size: 14,
              color: isSelected ? AppColors.primary : AppColors.textSecondary,
            )
          : null,
      label: Text(label),
      selected: isSelected,
      selectedColor: AppColors.primaryLight,
      backgroundColor: AppColors.surfaceVariant,
      labelStyle: TextStyle(
        fontSize: 12.5,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
        color: isSelected ? AppColors.primary : AppColors.textPrimary,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(
          color: isSelected ? AppColors.primary : AppColors.border,
          width: isSelected ? 1.5 : 1,
        ),
      ),
      showCheckmark: false,
      onSelected: (_) => onSelected(),
    );
  }

  void _showNotificationsModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Consumer(
          builder: (context, ref, child) {
            final notifsState = ref.watch(notificationsProvider);
            final notifs = notifsState.notifications;
            final unreadCount = notifsState.unreadCount;

            return Container(
              height: MediaQuery.of(ctx).size.height * 0.72,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  // Thanh kéo & Header
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
                              children: [
                                const Icon(Icons.notifications_active_outlined, color: AppColors.primary, size: 22),
                                const SizedBox(width: 8),
                                const Text(
                                  'Thông báo',
                                  style: TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.navy,
                                  ),
                                ),
                                if (unreadCount > 0) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      '$unreadCount',
                                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            if (unreadCount > 0)
                              TextButton(
                                onPressed: () {
                                  ref.read(notificationsProvider.notifier).markAllAsRead();
                                },
                                child: const Text(
                                  'Đã đọc tất cả',
                                  style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.bold),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Danh sách thông báo
                  Expanded(
                    child: notifs.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32.0),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(20),
                                    decoration: const BoxDecoration(
                                      color: AppColors.primaryLight,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.notifications_none_rounded, size: 48, color: AppColors.primary),
                                  ),
                                  const SizedBox(height: 16),
                                  const Text(
                                    'Chưa có thông báo mới',
                                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy),
                                  ),
                                  const SizedBox(height: 6),
                                  const Text(
                                    'Các thông báo đặt bánh và cập nhật tiến độ nhận bánh tại tiệm sẽ xuất hiện tại đây theo thời gian thực (WebSocket).',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary, height: 1.4),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            itemCount: notifs.length,
                            itemBuilder: (context, index) {
                              final item = notifs[index];
                              return InkWell(
                                onTap: () {
                                  if (!item.isRead) {
                                    ref.read(notificationsProvider.notifier).markAsRead(item.notificationId);
                                  }
                                  if (item.type == 'order') {
                                    Navigator.pop(ctx);
                                    widget.onNavigateTab?.call(2);
                                  }
                                },
                                borderRadius: BorderRadius.circular(14),
                                child: _buildNotificationItem(
                                  icon: item.type == 'order' ? Icons.cake_outlined : Icons.notifications_outlined,
                                  title: item.title,
                                  content: item.message,
                                  time: item.createdAt != null
                                      ? item.createdAt!.substring(11, 16)
                                      : 'Vừa xong',
                                  isUnread: !item.isRead,
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildNotificationItem({
    required IconData icon,
    required String title,
    required String content,
    required String time,
    required bool isUnread,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isUnread ? AppColors.primaryLight.withValues(alpha: 0.35) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isUnread ? AppColors.primary.withValues(alpha: 0.4) : AppColors.cardBorder,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isUnread ? AppColors.primaryLight : AppColors.surfaceVariant,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: isUnread ? FontWeight.w700 : FontWeight.w600,
                          color: AppColors.navy,
                        ),
                      ),
                    ),
                    if (isUnread)
                      Container(
                        width: 7,
                        height: 7,
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  content,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: AppColors.textSecondary,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  time,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Component: Thẻ sản phẩm chuẩn Mobile Web The Sweets ─────────────────────
class _ProductCard extends StatelessWidget {
  final ProductModel product;
  final VoidCallback onTap;

  const _ProductCard({required this.product, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.cardBorder, width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ảnh sản phẩm (bo góc trên 12px)
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    AppImage(
                      imagePath: product.image,
                      fit: BoxFit.cover,
                      placeholder: Container(
                        color: AppColors.surfaceVariant,
                        child: const Center(child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary)),
                      ),
                      errorWidget: Container(
                        color: AppColors.primaryLight,
                        child: const Center(child: Text('🧁', style: TextStyle(fontSize: 32))),
                      ),
                    ),
                    // Badge Danh mục nhỏ góc trên
                    if (product.categoryName != null)
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.9),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            product.categoryName!,
                            style: const TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w600,
                              color: AppColors.navy,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),

            // Thông tin tên & giá
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.productName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    AppTheme.formatCurrency(product.defaultPrice),
                    style: const TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary, // #d4845a
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

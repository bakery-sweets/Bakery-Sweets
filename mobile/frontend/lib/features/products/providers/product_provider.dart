import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../models/category_model.dart';
import '../models/product_model.dart';

// Provider danh sách Category (lấy 100% từ Server qua Backend API)
final categoriesProvider = FutureProvider<List<CategoryModel>>((ref) async {
  try {
    final response = await ApiClient().dio.get('/categories');
    if (response.statusCode == 200 && response.data is List) {
      final list = (response.data as List)
          .map((c) => CategoryModel.fromJson(c as Map<String, dynamic>))
          .toList();
      if (kDebugMode) {
        debugPrint('✅ [API Categories] Đã tải thành công ${list.length} danh mục từ Backend');
      }
      return [
        const CategoryModel(categoryId: 0, categoryName: 'Tất cả'),
        ...list,
      ];
    }
    return const [CategoryModel(categoryId: 0, categoryName: 'Tất cả')];
  } catch (err) {
    if (kDebugMode) {
      debugPrint('⚠️ [API Categories Error] $err');
    }
    rethrow;
  }
});

// Trạng thái tìm kiếm & lọc nâng cao
class ProductFilterState {
  final String searchQuery;
  final String category;
  final String selectedSize;
  final double minPrice;
  final double maxPrice;
  final String sortBy; // 'default', 'price_asc', 'price_desc'

  const ProductFilterState({
    this.searchQuery = '',
    this.category = 'Tất cả',
    this.selectedSize = 'Tất cả',
    this.minPrice = 0.0,
    this.maxPrice = 300000.0,
    this.sortBy = 'default',
  });

  bool get hasActiveFilter {
    return searchQuery.trim().isNotEmpty ||
        category != 'Tất cả' ||
        selectedSize != 'Tất cả' ||
        minPrice > 0.0 ||
        maxPrice < 300000.0 ||
        sortBy != 'default';
  }

  int get activeFilterCount {
    int count = 0;
    if (searchQuery.trim().isNotEmpty) count++;
    if (category != 'Tất cả') count++;
    if (selectedSize != 'Tất cả') count++;
    if (minPrice > 0.0 || maxPrice < 300000.0) count++;
    if (sortBy != 'default') count++;
    return count;
  }

  ProductFilterState copyWith({
    String? searchQuery,
    String? category,
    String? selectedSize,
    double? minPrice,
    double? maxPrice,
    String? sortBy,
  }) {
    return ProductFilterState(
      searchQuery: searchQuery ?? this.searchQuery,
      category: category ?? this.category,
      selectedSize: selectedSize ?? this.selectedSize,
      minPrice: minPrice ?? this.minPrice,
      maxPrice: maxPrice ?? this.maxPrice,
      sortBy: sortBy ?? this.sortBy,
    );
  }
}

// Notifier quản lý bộ lọc nâng cao theo chuẩn Riverpod 3
class ProductFilterNotifier extends Notifier<ProductFilterState> {
  @override
  ProductFilterState build() => const ProductFilterState();

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  void setCategory(String category) {
    state = state.copyWith(category: category);
  }

  void setSize(String size) {
    state = state.copyWith(selectedSize: size);
  }

  void setPriceRange(double min, double max) {
    state = state.copyWith(minPrice: min, maxPrice: max);
  }

  void setSortBy(String sort) {
    state = state.copyWith(sortBy: sort);
  }

  void applyAdvancedFilter({
    String? category,
    String? selectedSize,
    double? minPrice,
    double? maxPrice,
    String? sortBy,
  }) {
    state = state.copyWith(
      category: category,
      selectedSize: selectedSize,
      minPrice: minPrice,
      maxPrice: maxPrice,
      sortBy: sortBy,
    );
  }

  void reset() {
    state = const ProductFilterState();
  }
}

final productFilterProvider =
    NotifierProvider<ProductFilterNotifier, ProductFilterState>(ProductFilterNotifier.new);

// Bridge tương thích ngược cho selectedCategory
final selectedCategoryProvider = Provider<String>((ref) {
  return ref.watch(productFilterProvider).category;
});

// Provider danh sách tất cả sản phẩm (lấy 100% từ Server qua Backend API)
final productsProvider = FutureProvider<List<ProductModel>>((ref) async {
  try {
    final response = await ApiClient().dio.get('/products');
    if (response.statusCode == 200 && response.data is List) {
      final list = (response.data as List)
          .map((p) => ProductModel.fromJson(p as Map<String, dynamic>))
          .toList();
      if (kDebugMode) {
        debugPrint('✅ [API Products] Đã tải thành công ${list.length} sản phẩm từ Backend');
      }
      return list;
    }
    return [];
  } catch (err) {
    if (kDebugMode) {
      debugPrint('⚠️ [API Products Error] $err');
    }
    rethrow;
  }
});

// Provider danh sách sản phẩm theo bộ lọc tìm kiếm & nâng cao
final filteredProductsProvider = Provider<AsyncValue<List<ProductModel>>>((ref) {
  final productsAsync = ref.watch(productsProvider);
  final filter = ref.watch(productFilterProvider);

  return productsAsync.whenData((products) {
    var result = products.where((p) {
      // 1. Lọc từ khóa tìm kiếm
      if (filter.searchQuery.trim().isNotEmpty) {
        final q = filter.searchQuery.trim().toLowerCase();
        final matchName = p.productName.toLowerCase().contains(q);
        final matchCat = (p.categoryName ?? '').toLowerCase().contains(q);
        final matchIng = (p.ingredients ?? '').toLowerCase().contains(q);
        if (!matchName && !matchCat && !matchIng) return false;
      }

      // 2. Lọc danh mục
      if (filter.category != 'Tất cả' && filter.category != 'ALL') {
        final catName = p.categoryName ?? '';
        final matchCat = catName.toLowerCase().contains(filter.category.toLowerCase()) ||
            filter.category.toLowerCase().contains(catName.toLowerCase());
        if (!matchCat) return false;
      }

      // 3. Lọc theo kích cỡ (Size)
      if (filter.selectedSize != 'Tất cả') {
        if (!p.hasSize(filter.selectedSize)) return false;
      }

      // 4. Lọc theo khoảng giá
      if (p.sizes.isNotEmpty) {
        final hasSizeInRange = p.sizes.any(
          (s) => s.price >= filter.minPrice && s.price <= filter.maxPrice,
        );
        if (!hasSizeInRange) return false;
      } else {
        if (p.defaultPrice < filter.minPrice || p.defaultPrice > filter.maxPrice) {
          return false;
        }
      }

      return true;
    }).toList();

    // 5. Sắp xếp giá
    if (filter.sortBy == 'price_asc') {
      result.sort((a, b) => a.minPrice.compareTo(b.minPrice));
    } else if (filter.sortBy == 'price_desc') {
      result.sort((a, b) => b.maxPrice.compareTo(a.maxPrice));
    }

    return result;
  });
});

// Provider tìm kiếm sản phẩm theo ID
final productDetailProvider = Provider.family<ProductModel?, int>((ref, productId) {
  final products = ref.watch(productsProvider).asData?.value;
  if (products == null) return null;
  try {
    return products.firstWhere((p) => p.productId == productId);
  } catch (_) {
    return null;
  }
});

// Provider danh sách sản phẩm gợi ý (loại trừ sản phẩm hiện tại)
final suggestedProductsProvider = Provider.family<List<ProductModel>, int>((ref, currentProductId) {
  final products = ref.watch(productsProvider).asData?.value ?? [];
  return products.where((p) => p.productId != currentProductId).take(4).toList();
});

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../models/category_model.dart';
import '../models/product_model.dart';

// Dữ liệu mẫu chuẩn bị sẵn (đồng bộ hoàn hảo với data.sql & web)
final List<CategoryModel> _defaultCategories = [
  const CategoryModel(categoryId: 0, categoryName: 'Tất cả'),
  const CategoryModel(categoryId: 1, categoryName: 'Mousse Cake', description: 'Bánh mousse mềm mịn thanh mát'),
  const CategoryModel(categoryId: 2, categoryName: 'Croissant & Pastry', description: 'Bánh sừng bò ngàn lớp'),
  const CategoryModel(categoryId: 3, categoryName: 'Trà & Thức Uống', description: 'Trà tươi thanh nhiệt'),
];

final List<ProductModel> _defaultProducts = [
  // 1-9: Mousse Cakes
  const ProductModel(
    productId: 1,
    productName: 'Tiramisu Mousse',
    categoryId: 1,
    categoryName: 'Mousse Cake',
    image: 'assets/Img/Mousse/Tiramisu_Mousse.jpg',
    ingredients: 'Phô mai Mascarpone Ý, cà phê Espresso đậm đà, rượu Kahlua hảo hạng, cốt bánh Savoiardi mềm tan',
    expirationDate: '2 ngày',
    storageInstructions: 'Bảo quản ngăn mát 2-6°C',
    sizes: [
      ProductSizeModel(id: 1, sizeId: 1, sizeName: 'Size S (16cm)', price: 130000, stockQuantity: 15),
      ProductSizeModel(id: 2, sizeId: 2, sizeName: 'Size M (20cm)', price: 190000, stockQuantity: 10),
      ProductSizeModel(id: 3, sizeId: 3, sizeName: 'Size L (24cm)', price: 260000, stockQuantity: 5),
    ],
  ),
  const ProductModel(
    productId: 2,
    productName: 'Strawberry Mousse',
    categoryId: 1,
    categoryName: 'Mousse Cake',
    image: 'assets/Img/Mousse/Strawberry_Mousse.jpg',
    ingredients: 'Dâu tây tươi Đà Lạt, kem tươi whipping Anchor, gelatin Pháp, cốt bông lan vani',
    expirationDate: '2 ngày',
    storageInstructions: 'Bảo quản ngăn mát 2-6°C',
    sizes: [
      ProductSizeModel(id: 4, sizeId: 1, sizeName: 'Size S (16cm)', price: 135000, stockQuantity: 12),
      ProductSizeModel(id: 5, sizeId: 2, sizeName: 'Size M (20cm)', price: 195000, stockQuantity: 8),
      ProductSizeModel(id: 6, sizeId: 3, sizeName: 'Size L (24cm)', price: 270000, stockQuantity: 4),
    ],
  ),
  const ProductModel(
    productId: 3,
    productName: 'Avocado Mousse',
    categoryId: 1,
    categoryName: 'Mousse Cake',
    image: 'assets/Img/Mousse/Avocado_Mousse.jpg',
    ingredients: 'Bơ sáp Đắk Lắk béo ngậy, sữa đặc cao cấp, kem tươi Pháp, thạch bơ thanh mát',
    expirationDate: '2 ngày',
    storageInstructions: 'Bảo quản ngăn mát 2-6°C',
    sizes: [
      ProductSizeModel(id: 7, sizeId: 1, sizeName: 'Size S (16cm)', price: 125000, stockQuantity: 14),
      ProductSizeModel(id: 8, sizeId: 2, sizeName: 'Size M (20cm)', price: 185000, stockQuantity: 10),
      ProductSizeModel(id: 9, sizeId: 3, sizeName: 'Size L (24cm)', price: 255000, stockQuantity: 6),
    ],
  ),
  const ProductModel(
    productId: 4,
    productName: 'Blueberry Mousse',
    categoryId: 1,
    categoryName: 'Mousse Cake',
    image: 'assets/Img/Mousse/Blueberry_Mousse.jpg',
    ingredients: 'Việt quất New Zealand tươi, sữa chua Hy Lạp, kem whipping béo mịn, sốt việt quất tự nấu',
    expirationDate: '2 ngày',
    storageInstructions: 'Bảo quản ngăn mát 2-6°C',
    sizes: [
      ProductSizeModel(id: 10, sizeId: 1, sizeName: 'Size S (16cm)', price: 140000, stockQuantity: 10),
      ProductSizeModel(id: 11, sizeId: 2, sizeName: 'Size M (20cm)', price: 205000, stockQuantity: 8),
      ProductSizeModel(id: 12, sizeId: 3, sizeName: 'Size L (24cm)', price: 280000, stockQuantity: 4),
    ],
  ),
  const ProductModel(
    productId: 5,
    productName: 'Mango Mousse',
    categoryId: 1,
    categoryName: 'Mousse Cake',
    image: 'assets/Img/Mousse/Mango_Mousse.jpg',
    ingredients: 'Xoài cát Hòa Lộc chín mọng, chanh dây thanh mát, kem tươi, thạch xoài vàng ươm',
    expirationDate: '2 ngày',
    storageInstructions: 'Bảo quản ngăn mát 2-6°C',
    sizes: [
      ProductSizeModel(id: 13, sizeId: 1, sizeName: 'Size S (16cm)', price: 130000, stockQuantity: 15),
      ProductSizeModel(id: 14, sizeId: 2, sizeName: 'Size M (20cm)', price: 190000, stockQuantity: 10),
      ProductSizeModel(id: 15, sizeId: 3, sizeName: 'Size L (24cm)', price: 260000, stockQuantity: 5),
    ],
  ),
  const ProductModel(
    productId: 6,
    productName: 'Corn Mousse',
    categoryId: 1,
    categoryName: 'Mousse Cake',
    image: 'assets/Img/Mousse/Corn_Mousse.jpg',
    ingredients: 'Bắp ngọt Mỹ tách hạt, sữa bắp non thanh ngọt, kem phô mai mascarpone, bột bắp thơm lừng',
    expirationDate: '2 ngày',
    storageInstructions: 'Bảo quản ngăn mát 2-6°C',
    sizes: [
      ProductSizeModel(id: 16, sizeId: 1, sizeName: 'Size S (16cm)', price: 120000, stockQuantity: 18),
      ProductSizeModel(id: 17, sizeId: 2, sizeName: 'Size M (20cm)', price: 180000, stockQuantity: 12),
      ProductSizeModel(id: 18, sizeId: 3, sizeName: 'Size L (24cm)', price: 250000, stockQuantity: 6),
    ],
  ),
  const ProductModel(
    productId: 7,
    productName: 'Melon Mousse',
    categoryId: 1,
    categoryName: 'Mousse Cake',
    image: 'assets/Img/Mousse/Melon_Mousse.jpg',
    ingredients: 'Dưa lưới Nhật Bản ngọt thanh, thạch dưa lưới giòn dẻo, kem whipping tươi béo nhẹ',
    expirationDate: '2 ngày',
    storageInstructions: 'Bảo quản ngăn mát 2-6°C',
    sizes: [
      ProductSizeModel(id: 19, sizeId: 1, sizeName: 'Size S (16cm)', price: 135000, stockQuantity: 12),
      ProductSizeModel(id: 20, sizeId: 2, sizeName: 'Size M (20cm)', price: 195000, stockQuantity: 8),
      ProductSizeModel(id: 21, sizeId: 3, sizeName: 'Size L (24cm)', price: 270000, stockQuantity: 4),
    ],
  ),
  const ProductModel(
    productId: 8,
    productName: 'Pink Grapefruit Mousse',
    categoryId: 1,
    categoryName: 'Mousse Cake',
    image: 'assets/Img/Mousse/Pink_Grapefruit Mousse.jpg',
    ingredients: 'Bưởi hồng mọng nước, mật ong hoa nhãn, kem sữa chua mát lạnh, tép bưởi tươi giòn ngọt',
    expirationDate: '2 ngày',
    storageInstructions: 'Bảo quản ngăn mát 2-6°C',
    sizes: [
      ProductSizeModel(id: 22, sizeId: 1, sizeName: 'Size S (16cm)', price: 125000, stockQuantity: 14),
      ProductSizeModel(id: 23, sizeId: 2, sizeName: 'Size M (20cm)', price: 185000, stockQuantity: 10),
      ProductSizeModel(id: 24, sizeId: 3, sizeName: 'Size L (24cm)', price: 255000, stockQuantity: 5),
    ],
  ),
  const ProductModel(
    productId: 9,
    productName: 'Longan Mousse',
    categoryId: 1,
    categoryName: 'Mousse Cake',
    image: 'assets/Img/Mousse/Longan_Mousse.jpg',
    ingredients: 'Nhãn lồng Hưng Yên tươi, hạt sen ngâm đường phèn, kem tươi hoa nhài thơm ngát',
    expirationDate: '2 ngày',
    storageInstructions: 'Bảo quản ngăn mát 2-6°C',
    sizes: [
      ProductSizeModel(id: 25, sizeId: 1, sizeName: 'Size S (16cm)', price: 130000, stockQuantity: 15),
      ProductSizeModel(id: 26, sizeId: 2, sizeName: 'Size M (20cm)', price: 190000, stockQuantity: 10),
      ProductSizeModel(id: 27, sizeId: 3, sizeName: 'Size L (24cm)', price: 260000, stockQuantity: 5),
    ],
  ),
  // 10-18: Croissant & Pastry
  const ProductModel(
    productId: 10,
    productName: 'Plain Butter Croissant',
    categoryId: 2,
    categoryName: 'Croissant & Pastry',
    image: 'assets/Img/Croissant/Plain_Croissant.png',
    ingredients: 'Bột mì T55 Pháp, bơ lạt Elle & Vire hảo hạng cán 27 lớp ngàn tầng, men tự nhiên',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Bảo quản nơi khô ráo, hâm nóng trước khi ăn',
    sizes: [
      ProductSizeModel(id: 28, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 35000, stockQuantity: 40),
    ],
  ),
  const ProductModel(
    productId: 11,
    productName: 'Choco Mallow Croissant',
    categoryId: 2,
    categoryName: 'Croissant & Pastry',
    image: 'assets/Img/Croissant/Choco_Mallow_Croissant.png',
    ingredients: 'Vỏ croissant giòn rụm, sốt socola đen Bỉ 70%, marshmallow dẻo nướng xém thơm lừng',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Bảo quản nơi thoáng mát',
    sizes: [
      ProductSizeModel(id: 29, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 45000, stockQuantity: 30),
    ],
  ),
  const ProductModel(
    productId: 12,
    productName: 'Dinosaur Almond Croissant',
    categoryId: 2,
    categoryName: 'Croissant & Pastry',
    image: 'assets/Img/Croissant/Dinosaur_Almond_Croissant.png',
    ingredients: 'Bánh sừng bò nướng 2 lần, phủ ngập hạnh nhân lát giòn tan, sốt kem hạnh nhân frangipane',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Bảo quản nhiệt độ phòng',
    sizes: [
      ProductSizeModel(id: 30, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 55000, stockQuantity: 25),
    ],
  ),
  const ProductModel(
    productId: 13,
    productName: 'Honey Almond Croissant',
    categoryId: 2,
    categoryName: 'Croissant & Pastry',
    image: 'assets/Img/Croissant/Honey_Almond_Croissant.png',
    ingredients: 'Bơ lạt Pháp, mật ong hoa rừng nguyên chất, hạnh nhân nướng bùi béo ngọt nhẹ',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Bảo quản nhiệt độ phòng',
    sizes: [
      ProductSizeModel(id: 31, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 48000, stockQuantity: 25),
    ],
  ),
  const ProductModel(
    productId: 14,
    productName: 'Matcha Croissant',
    categoryId: 2,
    categoryName: 'Croissant & Pastry',
    image: 'assets/Img/Croissant/Matcha_Croissant.jpg',
    ingredients: 'Bột trà xanh Uji Kyoto phủ lớp glaze matcha đậm vị, nhân kem matcha béo ngậy chảy tràn',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Bảo quản nơi khô ráo',
    sizes: [
      ProductSizeModel(id: 32, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 45000, stockQuantity: 30),
    ],
  ),
  const ProductModel(
    productId: 15,
    productName: 'Salted Caramel Croissant',
    categoryId: 2,
    categoryName: 'Croissant & Pastry',
    image: 'assets/Img/Croissant/Salted_Caramel_Croissant.png',
    ingredients: 'Sốt caramel muối biển Guérande Pháp béo mặn hài hòa, hạt macca rang giòn rụm',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Bảo quản nơi thoáng mát',
    sizes: [
      ProductSizeModel(id: 33, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 48000, stockQuantity: 25),
    ],
  ),
  const ProductModel(
    productId: 16,
    productName: 'Strawberry Dream Croissant',
    categoryId: 2,
    categoryName: 'Croissant & Pastry',
    image: 'assets/Img/Croissant/Strawberry_Dream_Croissant.png',
    ingredients: 'Bánh croissant giòn xốp kẹp dâu tây tươi, kem tươi Chantilly vani Madagascar',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Bảo quản mát hoặc dùng ngay',
    sizes: [
      ProductSizeModel(id: 34, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 52000, stockQuantity: 20),
    ],
  ),
  const ProductModel(
    productId: 17,
    productName: 'Tiramisu Croissant',
    categoryId: 2,
    categoryName: 'Croissant & Pastry',
    image: 'assets/Img/Croissant/Tiramisu_Croissant.png',
    ingredients: 'Cà phê Espresso thấm vào ruột bánh, phủ kem phô mai mascarpone và bột cacao đậm đà',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Bảo quản mát',
    sizes: [
      ProductSizeModel(id: 35, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 50000, stockQuantity: 20),
    ],
  ),
  const ProductModel(
    productId: 18,
    productName: 'Avocado Croissant',
    categoryId: 2,
    categoryName: 'Croissant & Pastry',
    image: 'assets/Img/Croissant/Avocado_Croissant.jpg',
    ingredients: 'Bơ sáp tươi nghiền nhuyễn, phô mai lát, mật ong và vỏ bánh ngàn lớp thơm lừng',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Bảo quản nơi thoáng mát',
    sizes: [
      ProductSizeModel(id: 36, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 42000, stockQuantity: 25),
    ],
  ),
  // 19-27: Trà & Thức Uống
  const ProductModel(
    productId: 19,
    productName: 'Lemon Tea',
    categoryId: 3,
    categoryName: 'Trà & Thức Uống',
    image: 'assets/Img/Drink/Lemon_Tea.png',
    ingredients: 'Trà đen Ceylon đậm vị, chanh vàng tươi mọng nước, mật ong hoa nhãn thanh mát',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Uống trực tiếp kèm đá',
    sizes: [
      ProductSizeModel(id: 37, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 35000, stockQuantity: 50),
      ProductSizeModel(id: 38, sizeId: 5, sizeName: 'Ly lớn 500ml', price: 45000, stockQuantity: 50),
    ],
  ),
  const ProductModel(
    productId: 20,
    productName: 'Lychee Tea',
    categoryId: 3,
    categoryName: 'Trà & Thức Uống',
    image: 'assets/Img/Drink/Lychee_Tea.png',
    ingredients: 'Trà lài thơm ngát, trái vải thiều mọng nước, cánh hoa hồng sấy khô thanh tao',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Uống trực tiếp kèm đá',
    sizes: [
      ProductSizeModel(id: 39, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 38000, stockQuantity: 45),
      ProductSizeModel(id: 40, sizeId: 5, sizeName: 'Ly lớn 500ml', price: 48000, stockQuantity: 45),
    ],
  ),
  const ProductModel(
    productId: 21,
    productName: 'Strawberry Tea',
    categoryId: 3,
    categoryName: 'Trà & Thức Uống',
    image: 'assets/Img/Drink/Strawberry_Tea.png',
    ingredients: 'Dâu tây nghiền tươi, trà đen thượng hạng, thạch dâu tây giòn dai thanh mát',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Uống trực tiếp kèm đá',
    sizes: [
      ProductSizeModel(id: 41, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 40000, stockQuantity: 45),
      ProductSizeModel(id: 42, sizeId: 5, sizeName: 'Ly lớn 500ml', price: 50000, stockQuantity: 45),
    ],
  ),
  const ProductModel(
    productId: 22,
    productName: 'Matcha Latte',
    categoryId: 3,
    categoryName: 'Trà & Thức Uống',
    image: 'assets/Img/Drink/Matcha_Latte.png',
    ingredients: 'Bột matcha Uji thượng hạng, sữa tươi thanh trùng Barista, kem béo ngọt dịu',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Dùng kèm đá hoặc nóng',
    sizes: [
      ProductSizeModel(id: 43, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 45000, stockQuantity: 50),
      ProductSizeModel(id: 44, sizeId: 5, sizeName: 'Ly lớn 500ml', price: 55000, stockQuantity: 50),
    ],
  ),
  const ProductModel(
    productId: 23,
    productName: 'Matcha Mallow',
    categoryId: 3,
    categoryName: 'Trà & Thức Uống',
    image: 'assets/Img/Drink/Matcha_Mallow.png',
    ingredients: 'Matcha đá xay béo mịn, kẹo marshmallow nướng, sốt caramel thơm lừng',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Uống trực tiếp kèm đá',
    sizes: [
      ProductSizeModel(id: 45, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 48000, stockQuantity: 40),
      ProductSizeModel(id: 46, sizeId: 5, sizeName: 'Ly lớn 500ml', price: 58000, stockQuantity: 40),
    ],
  ),
  const ProductModel(
    productId: 24,
    productName: 'Matcha Misu',
    categoryId: 3,
    categoryName: 'Trà & Thức Uống',
    image: 'assets/Img/Drink/Matcha_Misu.png',
    ingredients: 'Sự kết hợp hoàn hảo giữa Matcha trà xanh và kem phô mai Tiramisu bồng bềnh',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Uống trực tiếp kèm đá',
    sizes: [
      ProductSizeModel(id: 47, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 50000, stockQuantity: 40),
      ProductSizeModel(id: 48, sizeId: 5, sizeName: 'Ly lớn 500ml', price: 60000, stockQuantity: 40),
    ],
  ),
  const ProductModel(
    productId: 25,
    productName: 'Choco Mallow',
    categoryId: 3,
    categoryName: 'Trà & Thức Uống',
    image: 'assets/Img/Drink/Choco_Mallow.png',
    ingredients: 'Cacao nguyên chất nóng/đá, sữa đặc béo ngậy, phủ lớp marshmallow mềm mịn',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Uống trực tiếp',
    sizes: [
      ProductSizeModel(id: 49, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 45000, stockQuantity: 40),
      ProductSizeModel(id: 50, sizeId: 5, sizeName: 'Ly lớn 500ml', price: 55000, stockQuantity: 40),
    ],
  ),
  const ProductModel(
    productId: 26,
    productName: 'Strawberry Matcha Latte',
    categoryId: 3,
    categoryName: 'Trà & Thức Uống',
    image: 'assets/Img/Drink/Strawberry_Matcha_Latte.png',
    ingredients: 'Latte 3 tầng đẹp mắt: mứt dâu tây tươi, sữa tươi thanh trùng và lớp matcha Uji xanh mướt',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Khuấy đều trước khi uống',
    sizes: [
      ProductSizeModel(id: 51, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 52000, stockQuantity: 35),
      ProductSizeModel(id: 52, sizeId: 5, sizeName: 'Ly lớn 500ml', price: 62000, stockQuantity: 35),
    ],
  ),
  const ProductModel(
    productId: 27,
    productName: 'Tira Latte',
    categoryId: 3,
    categoryName: 'Trà & Thức Uống',
    image: 'assets/Img/Drink/Tira_Latte.png',
    ingredients: 'Cà phê Latte thơm lừng phủ lớp kem phô mai mascarpone béo ngậy và bột cacao',
    expirationDate: 'Trong ngày',
    storageInstructions: 'Uống trực tiếp',
    sizes: [
      ProductSizeModel(id: 53, sizeId: 4, sizeName: 'Tiêu chuẩn', price: 48000, stockQuantity: 40),
      ProductSizeModel(id: 54, sizeId: 5, sizeName: 'Ly lớn 500ml', price: 58000, stockQuantity: 40),
    ],
  ),
];

// Provider danh sách Category
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
  } catch (err) {
    if (kDebugMode) {
      debugPrint('⚠️ [API Categories Error] $err (dùng dữ liệu dự phòng)');
    }
  }
  return _defaultCategories;
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

  bool get hasActiveFilter =>
      searchQuery.trim().isNotEmpty ||
      category != 'Tất cả' ||
      selectedSize != 'Tất cả' ||
      minPrice > 0.0 ||
      maxPrice < 300000.0 ||
      sortBy != 'default';

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

// Provider danh sách tất cả sản phẩm
final productsProvider = FutureProvider<List<ProductModel>>((ref) async {
  try {
    final response = await ApiClient().dio.get('/products');
    if (response.statusCode == 200 && response.data is List) {
      final list = (response.data as List)
          .map((p) => ProductModel.fromJson(p as Map<String, dynamic>))
          .toList();
      if (list.isNotEmpty) {
        if (kDebugMode) {
          debugPrint('✅ [API Products] Đã tải thành công ${list.length} sản phẩm từ Backend');
        }
        return list;
      }
    }
  } catch (err) {
    if (kDebugMode) {
      debugPrint('⚠️ [API Products Error] $err (dùng dữ liệu dự phòng)');
    }
  }
  return _defaultProducts;
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
  final productsAsync = ref.watch(productsProvider);
  return productsAsync.asData?.value.firstWhere(
    (p) => p.productId == productId,
    orElse: () => _defaultProducts.firstWhere(
      (p) => p.productId == productId,
      orElse: () => _defaultProducts.first,
    ),
  );
});

// Provider danh sách sản phẩm gợi ý (loại trừ sản phẩm hiện tại)
final suggestedProductsProvider = Provider.family<List<ProductModel>, int>((ref, currentProductId) {
  final productsAsync = ref.watch(productsProvider);
  final all = productsAsync.asData?.value ?? _defaultProducts;
  return all.where((p) => p.productId != currentProductId).take(4).toList();
});

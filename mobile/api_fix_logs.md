# Nhật Ký Sửa Lỗi API - Mobile The Sweets (API Fix Logs)

Tệp này tự động lưu lại toàn bộ các lần phát hiện và sửa lỗi API (FastAPI backend & Flutter mobile client) theo quy định của dự án.

---

### [2026-10-09 19:15] Sửa lỗi API: `POST /api/v1/auth/login` & `POST /api/v1/auth/register`
- **Mô tả lỗi**: Xung đột và lỗi tiềm ẩn khi truy vấn thông tin tài khoản: bảng `customers` trong Database đã xóa bỏ cột `loyalty_points`, nhưng API Backend vẫn truy xuất `customer.loyalty_points` gây lỗi truy vấn SQL / Schema validation 500.
- **Nguyên nhân gốc rễ (Root Cause)**: Schema cơ sở dữ liệu `createTable.sql` đã cập nhật bỏ tính năng tích điểm của khách hàng, các model SQLAlchemy và Pydantic response schema chưa đồng bộ.
- **Giải pháp xử lý (Solution)**:
  - Loại bỏ cột `loyalty_points` trong SQLAlchemy model `Customer` ([user.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/models/user.py)).
  - Loại bỏ trường `loyalty_points` khỏi Pydantic schema `UserProfileOut` ([auth.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/schemas/auth.py)).
  - Đồng bộ hàm `_build_profile_out` và endpoint đăng ký trong [auth.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/api/v1/endpoints/auth.py).
- **Tệp tin đã thay đổi**:
  - `mobile/backend/app/models/user.py`
  - `mobile/backend/app/schemas/auth.py`
  - `mobile/backend/app/api/v1/endpoints/auth.py`
- **Trạng thái**: Đã giải quyết xung đột Git, kiểm tra cú pháp và hoàn tất commit.

---

### [2026-10-09 20:50] Sửa lỗi API: `GET /api/v1/categories` & `GET /api/v1/products`
- **Mô tả lỗi**: Flutter Frontend không thể nhận dữ liệu từ Backend (gặp lỗi connection closed / 500 Internal Server Error / 404 Not Found), ứng dụng luôn phải chạy bằng dữ liệu mẫu fallback.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. Container Backend bị crash liên tục khi khởi động do thiếu thư viện `email-validator` (Pydantic `EmailStr`).
  2. Bảng `category` và `product` không tồn tại trong database `thesweets_db` do lỗi thứ tự Foreign Key trong `createTable.sql` (`import_receipt_details` được tạo trước `product` và `size`).
  3. `ApiClient` trong Flutter cấu hình `baseUrl` kèm `/api/v1`, khi gọi `dio.get('/categories')` có dấu gạch chéo đầu làm Dio tự động cắt bỏ `/api/v1` thành `/categories` (dẫn tới 404 Not Found).
- **Giải pháp xử lý (Solution)**:
  - Cài đặt `email-validator>=2.0.0` và bổ sung vào `requirements.txt`.
  - Sắp xếp lại thứ tự tạo bảng trong `createTable.sql`, nạp đầy đủ cấu trúc bảng và dữ liệu mẫu vào MariaDB `thesweets_db`.
  - Nâng cấp `ApiClient` với Interceptor chuẩn hóa đường dẫn tự động gắn tiền tố `/api/v1` và cơ chế debug logging.
  - Cập nhật `ProductModel` tự động map tên file ảnh từ database sang URL hình ảnh sắc nét.
- **Tệp tin đã thay đổi**:
  - `mobile/backend/requirements.txt`
  - `database/createTable.sql`
  - `mobile/frontend/lib/core/network/api_client.dart`
  - `mobile/frontend/lib/features/products/models/product_model.dart`
  - `mobile/frontend/lib/features/products/providers/product_provider.dart`
- **Trạng thái**: Đã test thành công cả 2 endpoint `GET /api/v1/categories` và `GET /api/v1/products` trả về HTTP 200 JSON từ cơ sở dữ liệu.

---

### [2026-10-09 21:00] Sửa lỗi API: `POST /api/v1/auth/login`
- **Mô tả lỗi**: Gọi API đăng nhập `POST /api/v1/auth/login` luôn báo 401 Unauthorized "Tên đăng nhập hoặc mật khẩu không chính xác", hash password không kiểm tra được.
- **Nguyên nhân gốc rễ (Root Cause)**: `passlib 1.7.4` không tương thích với `bcrypt >= 4.0.0` (gây lỗi `AttributeError: module 'bcrypt' has no attribute '__about__'`), khiến hàm `verify_password` luôn bắt exception và trả về `False`.
- **Giải pháp xử lý (Solution)**:
  - Hạ cấp và ghim cố định `bcrypt==3.2.2` trong `requirements.txt`.
  - Cập nhật hash mật khẩu chuẩn vào bảng `users` trong MariaDB.
  - Bổ sung giá trị `Banking` vào `payment_method` enum của bảng `orders` để hỗ trợ thanh toán chuyển khoản.
- **Tệp tin đã thay đổi**:
  - `mobile/backend/requirements.txt`
  - `mobile/backend/app/models/order.py`
  - `database/createTable.sql`
- **Trạng thái**: Đã kiểm tra trực tiếp qua curl `POST /api/v1/auth/login` với tài khoản `cus1 / 123` trả về 200 OK kèm JWT access_token.

---

### [2026-10-09 21:15] Sửa lỗi & Tích hợp API: `POST /api/v1/orders` & `GET /api/v1/orders`
- **Mô tả lỗi**: Khi người dùng đặt hàng chưa đăng nhập hoặc đặt hàng với thông tin thanh toán chuyển khoản và thời gian lấy hàng tại tiệm (Pick-up), luồng đặt hàng chưa yêu cầu xác thực bắt buộc và thiếu giao diện điền thông tin pick-up/hình thức thanh toán COD hoặc Chuyển khoản (Banking).
- **Nguyên nhân gốc rễ (Root Cause)**: Endpoint `POST /api/v1/orders` và `GET /api/v1/orders` yêu cầu xác thực người dùng (`Depends(get_current_user)`). Nếu người dùng chưa đăng nhập, backend sẽ trả về lỗi 401 Unauthorized. Đồng thời, schema backend yêu cầu thông tin `recipient_name`, `recipient_phone`, `pickup_time` và `payment_method`.
- **Giải pháp xử lý (Solution)**:
  - Bổ sung logic kiểm tra trạng thái đăng nhập (`authProvider.isAuthenticated`) ngay tại [cart_screen.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/cart/screens/cart_screen.dart) và [checkout_modal.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/cart/screens/checkout_modal.dart). Khi chưa đăng nhập, tự động kích hoạt [LoginModal](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/auth/screens/login_modal.dart) để người dùng đăng nhập trước.
  - Xây dựng modal xác nhận đặt hàng [CheckoutModal](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/cart/screens/checkout_modal.dart) thu thập đầy đủ:
    1. Thời gian lấy bánh (Pick-up): chọn nhanh (+30p, +1h, +2h) hoặc chọn ngày/giờ tùy biến.
    2. Hình thức thanh toán: Tiền mặt khi nhận bánh (COD) hoặc Chuyển khoản ngân hàng (Banking) kèm thông tin STK Vietcombank của tiệm.
    3. Thông tin người nhận: Họ tên, số điện thoại và ghi chú.
  - Kết nối [orders_provider.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/orders/providers/orders_provider.dart) và [orders_screen.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/orders/screens/orders_screen.dart) với `GET /api/v1/orders` để hiển thị lịch sử đơn hàng thực tế sau khi đặt thành công.
- **Tệp tin đã thay đổi**:
  - `mobile/frontend/lib/features/cart/screens/cart_screen.dart`
  - `mobile/frontend/lib/features/cart/screens/checkout_modal.dart`
  - `mobile/frontend/lib/features/orders/models/order_model.dart`
  - `mobile/frontend/lib/features/orders/providers/orders_provider.dart`
  - `mobile/frontend/lib/features/orders/screens/orders_screen.dart`
  - `mobile/frontend/lib/features/profile/screens/profile_screen.dart`
- **Trạng thái**: Đã kiểm tra API `POST /api/v1/orders` và `GET /api/v1/orders` trả về HTTP 200 OK; Flutter code analyze 0 lỗi.

---

### [2026-10-09 21:25] Tích hợp WebSocket Real-time: `GET /api/v1/notifications` & `/ws/notifications/{user_name}`
- **Mô tả lỗi / Tính năng**: Khi khách đặt hàng thành công hoặc khi đơn hàng được tiệm bánh cập nhật trạng thái làm bánh (Processing, Ready...), ứng dụng Mobile chưa có cơ chế nhận sự kiện đẩy (push event) qua WebSocket theo thời gian thực để cập nhật đơn hàng và phát thông báo in-app.
- **Nguyên nhân gốc rễ (Root Cause)**: Backend FastAPI đã có router WebSocket `/ws/notifications/{user_name}` và `/ws/orders/{order_id}`, nhưng phía Flutter Mobile client chưa có kết nối WebSocket native để nhận event `new_notification`.
- **Giải pháp xử lý (Solution)**:
  - Bổ sung cấu hình WebSocket URL vào [app_config.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/core/config/app_config.dart).
  - Xây dựng dịch vụ kết nối socket [websocket_service.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/core/network/websocket_service.dart) sử dụng `dart:io` native, tự động ping giữ kết nối và tự phục hồi kết nối (auto-reconnect) khi rớt mạng.
  - Xây dựng [notifications_provider.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/notifications/providers/notifications_provider.dart) tự động lắng nghe socket khi tài khoản đăng nhập:
    - Khi có thông báo mới từ backend, lập tức hiển thị thông báo nổi (floating SnackBar) trên màn hình.
    - Tự động gọi `ordersProvider.fetchOrders()` để làm mới danh sách đơn hàng tức thì mà không cần kéo vuốt màn hình.
  - Nối số lượng thông báo chưa đọc vào chuông thông báo trên AppBar [home_screen.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/home/screens/home_screen.dart) và hiển thị danh sách thông báo động kèm tính năng "Đã đọc tất cả" / "Đánh dấu đã đọc".
- **Tệp tin đã thay đổi**:
  - `mobile/frontend/lib/core/config/app_config.dart`
  - `mobile/frontend/lib/core/network/websocket_service.dart`
  - `mobile/frontend/lib/features/notifications/models/notification_model.dart`
  - `mobile/frontend/lib/features/notifications/providers/notifications_provider.dart`
  - `mobile/frontend/lib/features/home/screens/home_screen.dart`
- **Trạng thái**: Đã kiểm tra kết nối WebSocket `ws://127.0.0.1:8000/api/v1/ws/notifications/cus1` hoạt động ổn định; Flutter code analyze 0 lỗi.

---

### [2026-10-09 21:38] Sửa lỗi hiển thị sản phẩm & hình ảnh: `GET /api/v1/products`
- **Mô tả lỗi**: Màn hình Home và chi tiết sản phẩm hiển thị không đúng danh mục/sản phẩm thực tế trong Database (chỉ thấy 4-6 sản phẩm mẫu cũ), và hình ảnh sản phẩm bị lỗi hiển thị thành biểu tượng bánh 🧁 hoặc ảnh placeholder Unsplash ngẫu nhiên.
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. Trong Database MariaDB `thesweets_db`, file seed ban đầu chỉ có 4 sản phẩm mẫu, chưa nạp toàn bộ 27 sản phẩm bánh và đồ uống thực tế của tiệm.
  2. Bảng `product` trong Database lưu đường dẫn ảnh cục bộ `assets/Img/...` (hoặc tên file ảnh tương đối), nhưng trên Flutter Frontend các màn hình `HomeScreen`, `ProductDetailScreen`, `CartScreen`, `OrdersScreen` đều sử dụng `CachedNetworkImage(imageUrl: ...)` để nạp ảnh qua HTTP. Do đó, `CachedNetworkImage` không thể load được đường dẫn asset cục bộ, kích hoạt `errorWidget` hiển thị biểu tượng `🧁`.
  3. Cấu hình `AppConfig.baseUrl` trước đó bị cố định `10.0.2.2:8000` khiến khi chạy ứng dụng trên Windows Desktop hoặc thiết bị thật không kết nối được tới Backend.
- **Giải pháp xử lý (Solution)**:
  - Cập nhật [data.sql](file:///d:/DATA/Code/Bakery-Sweets/database/data.sql) nạp đầy đủ toàn bộ 27 sản phẩm thuộc 3 danh mục chính (`Mousse Cake`, `Croissant & Pastry`, `Trà & Thức Uống`) cùng các kích cỡ và đơn giá chuẩn, map chính xác đường dẫn ảnh trong thư mục `assets/Img/`. Đã reload toàn bộ vào MariaDB `thesweets_db`.
  - Tạo mới widget đa năng [AppImage](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/core/widgets/app_image.dart) tự động nhận diện và xử lý thông minh cả ảnh mạng HTTP (`CachedNetworkImage`) lẫn ảnh asset cục bộ (`Image.asset`), có hiệu ứng shimmer placeholder và error fallback tinh tế.
  - Cập nhật `_resolveImageUrl` trong [product_model.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/products/models/product_model.dart) bảo toàn đường dẫn asset thực tế.
  - Thay thế toàn bộ `CachedNetworkImage` bằng `AppImage` trên toàn bộ các màn hình:
    - [home_screen.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/home/screens/home_screen.dart) (Banner & Product Card)
    - [product_detail_screen.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/products/screens/product_detail_screen.dart) (Ảnh sản phẩm chính & gợi ý sản phẩm)
    - [cart_screen.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/cart/screens/cart_screen.dart) (Thumbnail sản phẩm trong giỏ hàng)
    - [orders_screen.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/orders/screens/orders_screen.dart) (Thumbnail sản phẩm trong chi tiết đơn hàng)
  - Đồng bộ danh sách fallback 27 sản phẩm chuẩn vào [product_provider.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/products/providers/product_provider.dart).
  - Tự động nhận diện nền tảng trong [app_config.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/core/config/app_config.dart) (`10.0.2.2` trên Android Emulator, `localhost` trên Windows / Chrome).
- **Tệp tin đã thay đổi**:
  - `database/data.sql`
  - `mobile/frontend/lib/core/config/app_config.dart`
  - `mobile/frontend/lib/core/widgets/app_image.dart`
  - `mobile/frontend/lib/features/products/models/product_model.dart`
  - `mobile/frontend/lib/features/products/providers/product_provider.dart`
  - `mobile/frontend/lib/features/home/screens/home_screen.dart`
  - `mobile/frontend/lib/features/products/screens/product_detail_screen.dart`
  - `mobile/frontend/lib/features/cart/screens/cart_screen.dart`
  - `mobile/frontend/lib/features/orders/screens/orders_screen.dart`
- **Trạng thái**: Đã xác nhận API `GET /api/v1/products` trả về 27 sản phẩm; Flutter code analyze 0 cảnh báo, 0 lỗi.

---

### [2026-10-09 21:42] Sửa lỗi font chữ tiếng Việt (Mojibake / `??`) khi load sản phẩm từ DB
- **Mô tả lỗi**: Phần mô tả thành phần bánh (`ingredients`), tên kích cỡ (`size_name`) và danh mục hiển thị trên ứng dụng bị lỗi font thành các dấu hỏi chấm `??` (ví dụ: `Xo??i c??t H??a L???c ch??n m???ng...`).
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. File `data.sql` trước đó thiếu khai báo `SET NAMES utf8mb4;` và `SET CHARACTER SET utf8mb4;` ở đầu file.
  2. Khi import SQL qua PowerShell bằng pipe standard IO trên Windows, luồng pipe tự động chuyển đổi sang mã hóa mặc định của console Windows (ANSI/OEM), làm sai lệch toàn bộ ký tự UTF-8 có dấu tiếng Việt khi lưu vào MariaDB.
- **Giải pháp xử lý (Solution)**:
  - Thêm `SET NAMES utf8mb4;` và `SET CHARACTER SET utf8mb4;` vào đầu file [data.sql](file:///d:/DATA/Code/Bakery-Sweets/database/data.sql).
  - Sử dụng `docker cp` để chuyển trực tiếp file `.sql` nguyên vẹn dạng UTF-8 vào trong container Docker, sau đó thực thi lệnh `mariadb --default-character-set=utf8mb4` nạp vào database mà không qua console encoding của Windows.
- **Tệp tin đã thay đổi**:
  - `database/data.sql`
- **Trạng thái**: Đã kiểm tra trực tiếp qua MariaDB và API Backend `GET /api/v1/products`: toàn bộ văn bản tiếng Việt hiển thị sắc nét, chuẩn 100% dấu ("Xoài cát Hòa Lộc chín mọng, chanh dây thanh mát, kem tươi, thạch xoài vàng ươm").

---

### [2026-10-09 21:56] Bổ sung API & Giao diện: Cập nhật thông tin tài khoản `PUT /api/v1/auth/profile`
- **Mô tả tính năng / Lỗi**:
  1. Người dùng chưa thể chỉnh sửa, cập nhật thông tin cá nhân của mình (họ tên, số điện thoại, email, giới tính).
  2. Mục "Giờ mở cửa tiệm bánh" có mũi tên điều hướng `>` gây hiểu lầm là màn hình có thể bấm chuyển trang.
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Backend FastAPI trước đó mới chỉ có endpoint đọc thông tin `GET /auth/me`, chưa có endpoint `PUT /auth/profile` để cập nhật thông tin trong bảng `customers` và `users`.
  - Giao diện `profile_screen.dart` dùng chung template có icon mũi tên `>` cho tất cả các mục danh sách.
- **Giải pháp xử lý (Solution)**:
  - Thêm schema [UpdateProfileRequest](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/schemas/auth.py) và endpoint `PUT /api/v1/auth/profile` (đồng thời alias `PUT /api/v1/auth/me`) trong [auth.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/api/v1/endpoints/auth.py) hỗ trợ cập nhật Họ, Tên, Số điện thoại, Giới tính và Email (kèm kiểm tra trùng lặp email/SĐT).
  - Bổ sung phương thức `updateProfile` vào [auth_provider.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/auth/providers/auth_provider.dart).
  - Xây dựng component [edit_profile_modal.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/profile/screens/edit_profile_modal.dart) dạng BottomSheet cho phép người dùng xem tên đăng nhập (khóa chỉ đọc), chỉnh sửa họ tên, email, SĐT, giới tính và lưu thay đổi theo thời gian thực.
  - Cập nhật [profile_screen.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/profile/screens/profile_screen.dart):
    - Thêm nút "Sửa" ngay trên thẻ người dùng và kết nối mục "Cập nhật thông tin tài khoản" với modal chỉnh sửa.
    - Xóa bỏ mũi tên chuyển hướng `>` tại mục "Giờ mở cửa tiệm bánh (07:30 - 21:30)" và "Hỗ trợ khách hàng", chuyển thành dạng thông tin mặc định, kèm dòng phụ đề rõ ràng.
- **Tệp tin đã thay đổi**:
  - `mobile/backend/app/schemas/auth.py`
  - `mobile/backend/app/api/v1/endpoints/auth.py`
  - `mobile/frontend/lib/features/auth/providers/auth_provider.dart`
  - `mobile/frontend/lib/features/profile/screens/edit_profile_modal.dart`
  - `mobile/frontend/lib/features/profile/screens/profile_screen.dart`
- **Trạng thái**: Đã test API `PUT /api/v1/auth/profile`; Flutter code analyze 0 cảnh báo, 0 lỗi.

---

### [2026-10-09 22:10] Bổ sung API & Tính năng: Kho Voucher `GET /api/v1/promotions` & Áp dụng Voucher khi thanh toán
- **Mô tả tính năng / Lỗi**:
  1. Khi thanh toán giỏ hàng, ứng dụng chưa có giao diện cho phép khách hàng áp dụng mã giảm giá / voucher khuyến mãi, chưa tính toán số tiền chiết khấu và chưa gửi mã ưu đãi (`promotion_id`) lên Backend.
  2. Tại màn hình Tài khoản (Profile), khách hàng chưa có mục/tab để xem kho voucher, điều kiện sử dụng (đơn tối thiểu, mức giảm tối đa) và hạn sử dụng của các chương trình khuyến mãi hiện có.
  3. Chọn giờ nhận bánh yêu cầu dạng con lăn cuộn mượt mà (scroll picker) để người dùng dễ thao tác.
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Backend đã có schema `OrderCreate` nhận `promotion_id` và logic tính giảm giá hóa đơn trong database, nhưng chưa có endpoint `GET /api/v1/promotions` công khai danh sách voucher còn hiệu lực cho ứng dụng Mobile.
  - Mobile Frontend chưa có màn hình quản lý Voucher và chưa có modal chọn/nhập mã ưu đãi trong luồng Checkout.
- **Giải pháp xử lý (Solution)**:
  - Bổ sung dữ liệu khuyến mãi vào bảng `promotions` và `invoice_promotions` trong [data.sql](file:///d:/DATA/Code/Bakery-Sweets/database/data.sql) (bao gồm `CTKM01` giảm 10%, `SWEET10` giảm 10%, `BANHNGOT` giảm 15% và `CTKM02` giảm 20k) kèm các điều kiện đơn hàng tối thiểu và giảm tối đa.
  - Xây dựng schema [promotion.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/schemas/promotion.py) và endpoint `GET /api/v1/promotions` trong [promotions.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/api/v1/endpoints/promotions.py) trả về danh sách khuyến mãi đang hoạt động. Đăng ký router vào [api.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/api/v1/api.py).
  - Xây dựng model [promotion_model.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/promotions/models/promotion_model.dart) và StateNotifier [promotions_provider.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/promotions/providers/promotions_provider.dart) tự động tải dữ liệu từ API `/promotions` (hỗ trợ offline fallback).
  - Xây dựng modal [voucher_selector_modal.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/promotions/screens/voucher_selector_modal.dart):
    - Cho phép chọn nhanh từ danh sách voucher hoặc nhập mã bằng tay.
    - Hiển thị trực quan trạng thái đủ điều kiện hoặc thiếu bao nhiêu tiền để được áp dụng.
  - Tích hợp vào [checkout_modal.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/cart/screens/checkout_modal.dart):
    - Thêm mục "3. Ưu đãi / Voucher" hiển thị mã voucher đã áp dụng và số tiền tiết kiệm được tô màu xanh nổi bật.
    - Tự động trừ tiền giảm giá vào tổng thanh toán, hiển thị rõ ràng: Tạm tính -> Giảm giá voucher -> Tổng thanh toán.
    - Nâng cấp bộ chọn giờ thành thanh cuộn bánh xe iOS hiện đại (`CupertinoDatePicker` / `CupertinoTimerPicker`) theo dạng scroll mượt mà.
    - Truyền `promotion_id` lên API `POST /api/v1/orders` khi tạo đơn hàng.
  - Xây dựng màn hình [promotions_screen.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/promotions/screens/promotions_screen.dart) "Kho Voucher & Ưu đãi" thiết kế dạng vé coupon chuyên nghiệp:
    - Hiển thị chi tiết hạn dùng, điều kiện đơn tối thiểu, nút sao chép mã voucher và nút "Dùng ngay" (chuyển hướng sang giỏ hàng/thực đơn).
  - Tích hợp mục "Kho Voucher & Ưu đãi" vào màn hình [profile_screen.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/profile/screens/profile_screen.dart).
- **Tệp tin đã thay đổi**:
  - `database/data.sql`
  - `mobile/backend/app/schemas/promotion.py`
  - `mobile/backend/app/api/v1/endpoints/promotions.py`
  - `mobile/backend/app/api/v1/endpoints/__init__.py`
  - `mobile/backend/app/api/v1/api.py`
  - `mobile/frontend/lib/features/promotions/models/promotion_model.dart`
  - `mobile/frontend/lib/features/promotions/providers/promotions_provider.dart`
  - `mobile/frontend/lib/features/promotions/screens/voucher_selector_modal.dart`
  - `mobile/frontend/lib/features/promotions/screens/promotions_screen.dart`
  - `mobile/frontend/lib/features/cart/screens/checkout_modal.dart`
  - `mobile/frontend/lib/features/profile/screens/profile_screen.dart`
- **Trạng thái**: Đã test API `GET /api/v1/promotions` trả về 200 OK với 4 voucher; Flutter code analyze 0 lỗi, 0 cảnh báo.

---

### [2026-10-09 22:20] Tối ưu hóa UI/UX: Giữ Bảng Lịch chọn Ngày & Thứ, Dùng Bánh Xe Cuộn (Scroll) cho Giờ Lấy Bánh
- **Mô tả yêu cầu / Điều chỉnh**:
  - Khi đặt hàng, khách hàng muốn:
    1. **Chọn ngày & thứ**: Giữ lại dạng **BẢNG LỊCH** trực quan (lưới ngày, tháng, thứ 2 -> CN).
    2. **Chọn giờ**: Sử dụng thanh cuộn bánh xe **SCROLL** (Cupertino Time Picker) mượt mà.
- **Giải pháp xử lý (Solution)**:
  - Cập nhật [checkout_modal.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/cart/screens/checkout_modal.dart):
    - Tách giao diện chọn thời gian thành 2 thẻ rõ ràng:
      - **"Bảng ngày & thứ"**: Gọi `showDatePicker` dạng bảng lịch lưới Material hiển thị chi tiết các ngày và thứ trong tuần.
      - **"Cuộn giờ"**: Gọi `CupertinoDatePicker(mode: CupertinoDatePickerMode.time, use24hFormat: true)` dạng bánh xe cuộn thời gian 24h.
    - Cung cấp nút tiện ích **"Đổi cả ngày & giờ"**: Thực hiện luồng liên hoàn tự động (mở Bảng lịch chọn ngày trước -> chọn xong tự động mở Bánh xe cuộn giờ).
    - Format hiển thị thông minh: `Hôm nay (Thứ Sáu)` / `Ngày mai (Thứ Bảy)` / `Thứ Sáu, 10/10/2026` kèm giờ nhận.
- **Tệp tin đã thay đổi**:
  - `mobile/frontend/lib/features/cart/screens/checkout_modal.dart`
- **Trạng thái**: Đã phân tích kiểm tra code `flutter analyze lib` đạt **0 lỗi, 0 cảnh báo**.

---

### [2026-10-09 22:25] Việt hóa hoàn toàn Bảng Lịch Chọn Ngày & Thứ (Vietnamese Localization)
- **Mô tả yêu cầu / Lỗi**:
  - Bảng lịch chọn ngày `showDatePicker` mặc định hiển thị ngôn ngữ tiếng Anh: tên tháng `October 2026`, tiêu đề ngày `Fri, Oct 9` và hàng thứ viết tắt 1 chữ cái `S M T W T F S` gây khó hiểu và dễ nhầm lẫn giữa Thứ Bảy và Chủ Nhật, Thứ Ba và Thứ Năm.
  - Người dùng yêu cầu chuyển sang tiếng Việt hiển thị rõ ràng thứ trong tuần và ngày tháng.
- **Giải pháp xử lý (Solution)**:
  - Bổ sung thư viện `flutter_localizations: sdk: flutter` vào [pubspec.yaml](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/pubspec.yaml).
  - Cấu hình `localizationsDelegates` (`GlobalMaterialLocalizations`, `GlobalWidgetsLocalizations`, `GlobalCupertinoLocalizations`), `supportedLocales` (`vi`, `en`) và `locale: Locale('vi', 'VN')` trong [main.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/main.dart).
  - Truyền trực tiếp `locale: const Locale('vi', 'VN')` vào hàm `showDatePicker` trong [checkout_modal.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/cart/screens/checkout_modal.dart).
  - Kết quả: Bảng lịch hiển thị chuẩn tiếng Việt 100%:
    - Hàng thứ hiển thị: `T2  T3  T4  T5  T6  T7  CN` (rõ ràng, trực quan, không còn bị nhầm `S` hay `T`).
    - Tên tháng hiển thị: `Tháng 10 năm 2026`.
    - Tiêu đề ngày chọn: `Thứ Sáu, 9 tháng 10`.
- **Tệp tin đã thay đổi**:
  - `mobile/frontend/pubspec.yaml`
  - `mobile/frontend/lib/main.dart`
  - `mobile/frontend/lib/features/cart/screens/checkout_modal.dart`
- **Trạng thái**: Hoàn tất `flutter pub get` và `flutter analyze lib` đạt 0 lỗi, 0 cảnh báo.

---

### [2026-10-09 22:30] Sửa lỗi & Tối ưu: Hiển thị Thông Báo khi Đặt Hàng Thành Công kèm Nút Chuyển Xem Lịch Sử
- **Mô tả lỗi / Yêu cầu**:
  - Khi người dùng bấm "Xác nhận đặt hàng" thành công, thông báo không hiện lên hoặc bị đóng mất do `_showSuccessDialog` được gọi sau `Navigator.pop(context)` trên một context đã bị unmount.
  - Người dùng yêu cầu: Sau khi đặt hàng xong, phải hiện rõ **thông báo kèm nút bấm để ấn chuyển ngay qua bên Lịch sử đơn hàng để xem**.
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Khi gọi `Navigator.pop(context)` đóng BottomSheet checkout, widget `_CheckoutModalState` bị deactivate. Việc tiếp tục gọi `showDialog(context: context)` sử dụng deactivated context khiến dialog không được mount vào widget tree hoặc biến mất cùng với route bị pop.
- **Giải pháp xử lý (Solution)**:
  - Tái cấu trúc hàm [CheckoutModal.show](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/cart/screens/checkout_modal.dart):
    - Đóng BottomSheet và trả dữ liệu kết quả đơn hàng (`order_code`, `pickup_display`, `final_amount`, `payment_method`, `discount_amount`) về cho màn hình cha [CartScreen](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/cart/screens/cart_screen.dart).
    - Màn hình cha thực hiện hiển thị **Dialog thông báo "Đặt bánh thành công!"**:
      - Hiển thị mã đơn hàng, giờ nhận bánh, hình thức thanh toán, số tiền.
      - Nút hành động chính nổi bật: **"Xem lịch sử đơn hàng"** (màu hồng `#ED8A9F` kèm icon biên lai) ➔ Khi bấm, tự động chuyển sang **Tab Lịch sử đơn hàng** (`navigationIndex = 2`).
      - Nút phụ "Ở lại giỏ hàng".
    - Đồng thời hiển thị **SnackBar thông báo nổi** (Floating SnackBar) kèm nút hành động **`[XEM LỊCH SỬ]`**.
  - Cập nhật cả 2 vị trí gọi `CheckoutModal.show` trong [cart_screen.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/cart/screens/cart_screen.dart) truyền `ref: ref`.
- **Tệp tin đã thay đổi**:
  - `mobile/frontend/lib/features/cart/screens/checkout_modal.dart`
  - `mobile/frontend/lib/features/cart/screens/cart_screen.dart`
- **Trạng thái**: Hoàn tất kiểm tra, `flutter analyze lib` đạt 0 lỗi, 0 cảnh báo.

---

### [2026-10-09 22:45] Tái cấu trúc Media: Đưa toàn bộ Ảnh Sản phẩm & Banner sang Backend `uploads/`, Cung cấp API `POST /api/v1/upload`
- **Mô tả yêu cầu / Kiến trúc**:
  - Khi Admin tạo món mới và upload ảnh trên Web, ảnh không thể tự động nạp vào file APK của Mobile nếu Mobile phụ thuộc vào tài sản đóng gói tĩnh (`assets/`).
  - Toàn bộ ảnh sản phẩm bánh (`Mousse`, `Croissant`, `Drink`) và banner khuyến mãi cần được chuyển sang lưu trữ tập trung tại thư mục `uploads/` trên Backend Server để cả Web và Mobile dùng chung. Logo và icon giao diện vẫn giữ nguyên trong `assets/` để app khởi động nhanh.
- **Giải pháp xử lý (Solution)**:
  1. **Backend Server (`mobile/backend`)**:
     - Tạo thư mục lưu trữ tập trung [mobile/backend/uploads](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/uploads) (được mount volume với Docker container).
     - Copy toàn bộ ảnh bánh (`Mousse`, `Croissant`, `Drink`), banner (`banner1.jpg`, `banner2.jpg`) và icon thanh toán vào `mobile/backend/uploads/`.
     - Cấu hình FastAPI phục vụ static files: `app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")` trong [main.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/main.py).
     - Xây dựng API [upload.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/api/v1/endpoints/upload.py) `POST /api/v1/upload` hỗ trợ nhận file ảnh từ Admin Web (kiểm tra định dạng, giới hạn 10MB, sinh tên file duy nhất và lưu vào thư mục `uploads/{folder}/`).
     - Đăng ký endpoint `upload_router` vào [api.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/api/v1/api.py).
  2. **Cơ sở dữ liệu (Database)**:
     - Cập nhật [data.sql](file:///d:/DATA/Code/Bakery-Sweets/database/data.sql) và MariaDB: Đổi toàn bộ đường dẫn ảnh cột `image` bảng `product` từ `assets/Img/...` thành `/uploads/...`.
  3. **Mobile Client (Flutter)**:
     - Nâng cấp [product_model.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/products/models/product_model.dart) (`_resolveImageUrl`) và [app_image.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/core/widgets/app_image.dart) tự động map đường dẫn `/uploads/...` thành URL hoàn chỉnh `${AppConfig.baseUrl}/uploads/...`.
     - Cập nhật banner trong [home_screen.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/home/screens/home_screen.dart) nạp trực tiếp qua `/uploads/...`.
     - Logo tiệm `assets/Img/Sweets.png` và icon app giữ nguyên trong `assets/` để đảm bảo tốc độ khởi động tức thì.
- **Tệp tin đã thay đổi**:
  - `mobile/backend/main.py`
  - `mobile/backend/app/api/v1/endpoints/upload.py`
  - `mobile/backend/app/api/v1/endpoints/__init__.py`
  - `mobile/backend/app/api/v1/api.py`
  - `database/data.sql`
  - `mobile/frontend/lib/core/widgets/app_image.dart`
  - `mobile/frontend/lib/features/products/models/product_model.dart`
  - `mobile/frontend/lib/features/home/screens/home_screen.dart`
- **Trạng thái**: Đã test API tĩnh `curl http://127.0.0.1:8000/uploads/...` trả về 200 OK (JPEG); Test API `POST /upload` thành công; `flutter analyze lib` đạt 0 lỗi, 0 cảnh báo.

---

### [2026-10-09 22:50] Sửa lỗi giao diện: Tràn viền phải (RIGHT OVERFLOWED) ở tiêu đề chọn thời gian nhận bánh
- **Mô tả lỗi**:
  - Tại modal xác nhận đặt hàng, phía bên phải dòng `1. Thời gian lấy bánh tại tiệm (Pick-up)` xuất hiện dải sọc vàng đen cảnh báo của Flutter: `A RenderFlex overflowed by ... pixels on the right`.
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Dòng tiêu đề đặt trong widget `Row` chứa chuỗi văn bản dài không giới hạn độ rộng cộng với nút bấm `Đổi cả ngày & giờ`, tổng chiều rộng vượt quá chiều rộng màn hình khả dụng của thiết bị.
- **Giải pháp xử lý (Solution)**:
  - Trong [checkout_modal.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/cart/screens/checkout_modal.dart):
    - Bọc tiêu đề trong `Expanded` với `TextOverflow.ellipsis`.
    - Rút gọn tiêu đề thành `1. Thời gian lấy bánh (Pick-up)` và nút bấm thành `Đổi cả hai`.
    - Đảm bảo co giãn linh hoạt 100% trên mọi kích thước màn hình điện thoại mà không bao giờ bị overflow.
- **Tệp tin đã thay đổi**:
  - `mobile/frontend/lib/features/cart/screens/checkout_modal.dart`
### [2026-10-09 23:10] Chuẩn hóa Nghiệp Vụ & Sửa lỗi API: Giới hạn 1 Voucher chỉ dùng 1 lần / mỗi tài khoản (`GET /api/v1/promotions` & `POST /api/v1/orders`)
- **Mô tả lỗi / Nghiệp vụ**:
  1. Người dùng có thể áp dụng cùng một mã voucher nhiều lần liên tiếp trên các đơn hàng khác nhau mà không bị giới hạn.
  2. Khi import `OrderStatus` trong [promotions.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/api/v1/endpoints/promotions.py) xảy ra lỗi `ImportError: cannot import name 'OrderStatus' from 'app.models.order'` khiến backend crash khi khởi động router.
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Bảng `promotions` trong cơ sở dữ liệu chưa có trường kiểm soát số lần sử dụng cho mỗi khách hàng (`usage_limit_per_user`) và tổng số lần (`total_usage_limit`).
  - Trong model [order.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/models/order.py), cột `status` là `SQLEnum` trực tiếp chứ không định nghĩa class `OrderStatus`, do đó import `OrderStatus` gây lỗi `ImportError`.
  - Endpoint `POST /api/v1/orders` chưa kiểm tra lịch sử đặt hàng của khách hàng đối với mã khuyến mãi được chọn trước khi lưu đơn.
- **Giải pháp xử lý (Solution)**:
  1. **Cơ sở dữ liệu (Database)**:
     - Thêm cột `usage_limit_per_user INT DEFAULT 1` và `total_usage_limit INT NULL` vào bảng `promotions` trong [createTable.sql](file:///d:/DATA/Code/Bakery-Sweets/database/createTable.sql), [data.sql](file:///d:/DATA/Code/Bakery-Sweets/database/data.sql) và MariaDB container `thesweets_db`.
     - Cập nhật toàn bộ các voucher mặc định (`SWEET10`, `BANHNGOT`, `CTKM01`, `CTKM02`) có `usage_limit_per_user = 1`.
  2. **Backend Server (`mobile/backend`)**:
     - Sửa lỗi import trong [promotions.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/api/v1/endpoints/promotions.py), sử dụng chuỗi trực tiếp `"Cancelled"` khi lọc đơn hàng hợp lệ.
     - Nâng cấp [promotion.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/schemas/promotion.py) bổ sung các trường: `usage_limit_per_user`, `total_usage_limit`, `used_by_current_user`, `is_used`, `can_use`.
     - Tích hợp dependency `get_optional_current_user` trong [security.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/core/security.py) và [promotions.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/api/v1/endpoints/promotions.py): Tự động đếm số đơn hàng hợp lệ (`status != 'Cancelled'`) của khách hàng hiện tại và tính toán `is_used = True`, `can_use = False` nếu đã đạt giới hạn.
     - Cập nhật [orders.py](file:///d:/DATA/Code/Bakery-Sweets/mobile/backend/app/api/v1/endpoints/orders.py): Trong `POST /orders`, kiểm tra chặt chẽ số lần khách hàng đã sử dụng voucher; nếu $\ge$ `usage_limit_per_user`, từ chối tạo đơn với mã lỗi 400 và thông báo thân thiện: `"Bạn đã sử dụng mã ưu đãi này rồi. Mỗi tài khoản chỉ được áp dụng tối đa 1 lần!"`.
  3. **Mobile Client (Flutter)**:
     - Cập nhật [promotion_model.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/promotions/models/promotion_model.dart): Thêm `isUsed`, `canUse`, `usageLimitPerUser`, `usedByCurrentUser`. `isEligible()` trả về `false` nếu `isUsed == true`.
     - Cập nhật [promotions_provider.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/promotions/providers/promotions_provider.dart): Lắng nghe trạng thái đăng nhập của `authProvider` để tự động làm mới danh sách voucher khi đăng nhập / đăng xuất.
     - Cập nhật [voucher_selector_modal.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/promotions/screens/voucher_selector_modal.dart):
       - Hiển thị nhãn `[ĐÃ DÙNG]`, icon đã dùng và làm mờ voucher đã sử dụng.
       - Chặn không cho chọn voucher đã dùng khi bấm vào thẻ hoặc nhập mã thủ công.
     - Cập nhật [promotions_screen.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/promotions/screens/promotions_screen.dart): Hiển thị nhãn `[ĐÃ SỬ DỤNG]` và nút xám vô hiệu hóa `"Đã sử dụng"`.
     - Cập nhật [checkout_modal.dart](file:///d:/DATA/Code/Bakery-Sweets/mobile/frontend/lib/features/cart/screens/checkout_modal.dart): Tự động invalidate `promotionsProvider` sau khi đặt hàng thành công và trích xuất chi tiết lỗi từ backend nếu có.
- **Tệp tin đã thay đổi**:
  - `database/createTable.sql`
  - `database/data.sql`
  - `mobile/backend/app/models/promotion.py`
  - `mobile/backend/app/schemas/promotion.py`
  - `mobile/backend/app/core/security.py`
  - `mobile/backend/app/api/v1/endpoints/promotions.py`
  - `mobile/backend/app/api/v1/endpoints/orders.py`
  - `mobile/frontend/lib/features/promotions/models/promotion_model.dart`
  - `mobile/frontend/lib/features/promotions/providers/promotions_provider.dart`
  - `mobile/frontend/lib/features/promotions/screens/voucher_selector_modal.dart`
  - `mobile/frontend/lib/features/promotions/screens/promotions_screen.dart`
  - `mobile/frontend/lib/features/cart/screens/checkout_modal.dart`
- **Trạng thái**: Đã test API trả về chuẩn xác theo tài khoản đăng nhập (`cus1` đã dùng 2 mã thì hiển thị `is_used: true, can_use: false`); Test chặn đặt hàng trùng voucher trả về 400; `flutter analyze lib` đạt 0 lỗi.




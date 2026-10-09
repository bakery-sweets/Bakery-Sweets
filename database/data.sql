-- ==============================================================================
-- SEED DATA: Dữ liệu mẫu hoàn chỉnh cho Bakery-Sweets (Mô hình nhận tại quầy)
-- ==============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Xóa dữ liệu cũ để nạp mới đồng bộ
TRUNCATE TABLE order_status_logs;
TRUNCATE TABLE order_promotions;
TRUNCATE TABLE order_detail;
TRUNCATE TABLE orders;
TRUNCATE TABLE cart;
TRUNCATE TABLE import_receipt_details;
TRUNCATE TABLE import_receipts;
TRUNCATE TABLE product_sizes;
TRUNCATE TABLE product;
TRUNCATE TABLE size;
TRUNCATE TABLE category;
TRUNCATE TABLE notifications;
TRUNCATE TABLE invoice_promotions;
TRUNCATE TABLE promotions;
TRUNCATE TABLE suppliers;
TRUNCATE TABLE customers;
TRUNCATE TABLE users;

-- 1. Kích cỡ bánh
INSERT INTO size (size_id, size_name) VALUES
(1, 'Size S (16cm)'),
(2, 'Size M (20cm)'),
(3, 'Size L (24cm)'),
(4, 'Tiêu chuẩn'),
(5, 'Ly lớn 500ml');

-- 2. Danh mục sản phẩm
INSERT INTO category (category_id, category_name, description) VALUES
(1, 'Mousse Cake', 'Bánh mousse mềm mịn thanh mát, ít ngọt chuẩn vị Pháp'),
(2, 'Croissant & Pastry', 'Bánh sừng bò ngàn lớp thơm bơ Pháp thượng hạng'),
(3, 'Trà & Thức Uống', 'Trà tươi thanh nhiệt và đồ uống kết hợp cùng bánh ngọt');

-- 3. Sản phẩm bánh (Khớp chính xác file ảnh trong assets/Img/)
INSERT INTO product (product_id, product_name, category_id, status, ingredients, expiration_date, storage_instructions, image) VALUES
-- Mousse Cakes
(1, 'Tiramisu Mousse', 1, 'Available', 'Phô mai Mascarpone Ý, cà phê Espresso đậm đà, rượu Kahlua hảo hạng, cốt bánh Savoiardi mềm tan', '2 ngày', 'Bảo quản ngăn mát 2-6°C', '/uploads/Mousse/Tiramisu_Mousse.jpg'),
(2, 'Strawberry Mousse', 1, 'Available', 'Dâu tây tươi Đà Lạt, kem tươi whipping Anchor, gelatin Pháp, cốt bông lan vani', '2 ngày', 'Bảo quản ngăn mát 2-6°C', '/uploads/Mousse/Strawberry_Mousse.jpg'),
(3, 'Avocado Mousse', 1, 'Available', 'Bơ sáp Đắk Lắk béo ngậy, sữa đặc cao cấp, kem tươi Pháp, thạch bơ thanh mát', '2 ngày', 'Bảo quản ngăn mát 2-6°C', '/uploads/Mousse/Avocado_Mousse.jpg'),
(4, 'Blueberry Mousse', 1, 'Available', 'Việt quất New Zealand tươi, sữa chua Hy Lạp, kem whipping béo mịn, sốt việt quất tự nấu', '2 ngày', 'Bảo quản ngăn mát 2-6°C', '/uploads/Mousse/Blueberry_Mousse.jpg'),
(5, 'Mango Mousse', 1, 'Available', 'Xoài cát Hòa Lộc chín mọng, chanh dây thanh mát, kem tươi, thạch xoài vàng ươm', '2 ngày', 'Bảo quản ngăn mát 2-6°C', '/uploads/Mousse/Mango_Mousse.jpg'),
(6, 'Corn Mousse', 1, 'Available', 'Bắp ngọt Mỹ tách hạt, sữa bắp non thanh ngọt, kem phô mai mascarpone, bột bắp thơm lừng', '2 ngày', 'Bảo quản ngăn mát 2-6°C', '/uploads/Mousse/Corn_Mousse.jpg'),
(7, 'Melon Mousse', 1, 'Available', 'Dưa lưới Nhật Bản ngọt thanh, thạch dưa lưới giòn dẻo, kem whipping tươi béo nhẹ', '2 ngày', 'Bảo quản ngăn mát 2-6°C', '/uploads/Mousse/Melon_Mousse.jpg'),
(8, 'Pink Grapefruit Mousse', 1, 'Available', 'Bưởi hồng mọng nước, mật ong hoa nhãn, kem sữa chua mát lạnh, tép bưởi tươi giòn ngọt', '2 ngày', 'Bảo quản ngăn mát 2-6°C', '/uploads/Mousse/Pink_Grapefruit Mousse.jpg'),
(9, 'Longan Mousse', 1, 'Available', 'Nhãn lồng Hưng Yên tươi, hạt sen ngâm đường phèn, kem tươi hoa nhài thơm ngát', '2 ngày', 'Bảo quản ngăn mát 2-6°C', '/uploads/Mousse/Longan_Mousse.jpg'),

-- Croissant & Pastry
(10, 'Plain Butter Croissant', 2, 'Available', 'Bột mì T55 Pháp, bơ lạt Elle & Vire hảo hạng cán 27 lớp ngàn tầng, men tự nhiên', 'Trong ngày', 'Bảo quản nơi khô ráo, hâm nóng trước khi ăn', '/uploads/Croissant/Plain_Croissant.png'),
(11, 'Choco Mallow Croissant', 2, 'Available', 'Vỏ croissant giòn rụm, sốt socola đen Bỉ 70%, marshmallow dẻo nướng xém thơm lừng', 'Trong ngày', 'Bảo quản nơi thoáng mát', '/uploads/Croissant/Choco_Mallow_Croissant.png'),
(12, 'Dinosaur Almond Croissant', 2, 'Available', 'Bánh sừng bò nướng 2 lần, phủ ngập hạnh nhân lát giòn tan, sốt kem hạnh nhân frangipane', 'Trong ngày', 'Bảo quản nhiệt độ phòng', '/uploads/Croissant/Dinosaur_Almond_Croissant.png'),
(13, 'Honey Almond Croissant', 2, 'Available', 'Bơ lạt Pháp, mật ong hoa rừng nguyên chất, hạnh nhân nướng bùi béo ngọt nhẹ', 'Trong ngày', 'Bảo quản nhiệt độ phòng', '/uploads/Croissant/Honey_Almond_Croissant.png'),
(14, 'Matcha Croissant', 2, 'Available', 'Bột trà xanh Uji Kyoto phủ lớp glaze matcha đậm vị, nhân kem matcha béo ngậy chảy tràn', 'Trong ngày', 'Bảo quản nơi khô ráo', '/uploads/Croissant/Matcha_Croissant.jpg'),
(15, 'Salted Caramel Croissant', 2, 'Available', 'Sốt caramel muối biển Guérande Pháp béo mặn hài hòa, hạt macca rang giòn rụm', 'Trong ngày', 'Bảo quản nơi thoáng mát', '/uploads/Croissant/Salted_Caramel_Croissant.png'),
(16, 'Strawberry Dream Croissant', 2, 'Available', 'Bánh croissant giòn xốp kẹp dâu tây tươi, kem tươi Chantilly vani Madagascar', 'Trong ngày', 'Bảo quản mát hoặc dùng ngay', '/uploads/Croissant/Strawberry_Dream_Croissant.png'),
(17, 'Tiramisu Croissant', 2, 'Available', 'Cà phê Espresso thấm vào ruột bánh, phủ kem phô mai mascarpone và bột cacao đậm đà', 'Trong ngày', 'Bảo quản mát', '/uploads/Croissant/Tiramisu_Croissant.png'),
(18, 'Avocado Croissant', 2, 'Available', 'Bơ sáp tươi nghiền nhuyễn, phô mai lát, mật ong và vỏ bánh ngàn lớp thơm lừng', 'Trong ngày', 'Bảo quản nơi thoáng mát', '/uploads/Croissant/Avocado_Croissant.jpg'),

-- Drinks
(19, 'Lemon Tea', 3, 'Available', 'Trà đen Ceylon đậm vị, chanh vàng tươi mọng nước, mật ong hoa nhãn thanh mát', 'Trong ngày', 'Uống trực tiếp kèm đá', '/uploads/Drink/Lemon_Tea.png'),
(20, 'Lychee Tea', 3, 'Available', 'Trà lài thơm ngát, trái vải thiều mọng nước, cánh hoa hồng sấy khô thanh tao', 'Trong ngày', 'Uống trực tiếp kèm đá', '/uploads/Drink/Lychee_Tea.png'),
(21, 'Strawberry Tea', 3, 'Available', 'Dâu tây nghiền tươi, trà đen thượng hạng, thạch dâu tây giòn dai thanh mát', 'Trong ngày', 'Uống trực tiếp kèm đá', '/uploads/Drink/Strawberry_Tea.png'),
(22, 'Matcha Latte', 3, 'Available', 'Bột matcha Uji thượng hạng, sữa tươi thanh trùng Barista, kem béo ngọt dịu', 'Trong ngày', 'Dùng kèm đá hoặc nóng', '/uploads/Drink/Matcha_Latte.png'),
(23, 'Matcha Mallow', 3, 'Available', 'Matcha đá xay béo mịn, kẹo marshmallow nướng, sốt caramel thơm lừng', 'Trong ngày', 'Uống trực tiếp kèm đá', '/uploads/Drink/Matcha_Mallow.png'),
(24, 'Matcha Misu', 3, 'Available', 'Sự kết hợp hoàn hảo giữa Matcha trà xanh và kem phô mai Tiramisu bồng bềnh', 'Trong ngày', 'Uống trực tiếp kèm đá', '/uploads/Drink/Matcha_Misu.png'),
(25, 'Choco Mallow', 3, 'Available', 'Cacao nguyên chất nóng/đá, sữa đặc béo ngậy, phủ lớp marshmallow mềm mịn', 'Trong ngày', 'Uống trực tiếp', '/uploads/Drink/Choco_Mallow.png'),
(26, 'Strawberry Matcha Latte', 3, 'Available', 'Latte 3 tầng đẹp mắt: mứt dâu tây tươi, sữa tươi thanh trùng và lớp matcha Uji xanh mướt', 'Trong ngày', 'Khuấy đều trước khi uống', '/uploads/Drink/Strawberry_Matcha_Latte.png'),
(27, 'Tira Latte', 3, 'Available', 'Cà phê Latte thơm lừng phủ lớp kem phô mai mascarpone béo ngậy và bột cacao', 'Trong ngày', 'Uống trực tiếp', '/uploads/Drink/Tira_Latte.png');

-- 4. Biến thể bánh theo size (Giá & Tồn kho)
INSERT INTO product_sizes (product_id, size_id, price, stock_quantity) VALUES
-- Mousse (Size S, M, L)
(1, 1, 130000.00, 15), (1, 2, 190000.00, 10), (1, 3, 260000.00, 5),
(2, 1, 135000.00, 12), (2, 2, 195000.00, 8),  (2, 3, 270000.00, 4),
(3, 1, 125000.00, 14), (3, 2, 185000.00, 10), (3, 3, 255000.00, 6),
(4, 1, 140000.00, 10), (4, 2, 205000.00, 8),  (4, 3, 280000.00, 4),
(5, 1, 130000.00, 15), (5, 2, 190000.00, 10), (5, 3, 260000.00, 5),
(6, 1, 120000.00, 18), (6, 2, 180000.00, 12), (6, 3, 250000.00, 6),
(7, 1, 135000.00, 12), (7, 2, 195000.00, 8),  (7, 3, 270000.00, 4),
(8, 1, 125000.00, 14), (8, 2, 185000.00, 10), (8, 3, 255000.00, 5),
(9, 1, 130000.00, 15), (9, 2, 190000.00, 10), (9, 3, 260000.00, 5),

-- Croissant (Tiêu chuẩn)
(10, 4, 35000.00, 40),
(11, 4, 45000.00, 30),
(12, 4, 55000.00, 25),
(13, 4, 48000.00, 25),
(14, 4, 45000.00, 30),
(15, 4, 48000.00, 25),
(16, 4, 52000.00, 20),
(17, 4, 50000.00, 20),
(18, 4, 42000.00, 25),

-- Drinks (Tiêu chuẩn & Ly lớn 500ml)
(19, 4, 35000.00, 50), (19, 5, 45000.00, 50),
(20, 4, 42000.00, 50), (20, 5, 52000.00, 50),
(21, 4, 40000.00, 50), (21, 5, 50000.00, 50),
(22, 4, 45000.00, 50), (22, 5, 55000.00, 50),
(23, 4, 48000.00, 40), (23, 5, 58000.00, 40),
(24, 4, 50000.00, 40), (24, 5, 60000.00, 40),
(25, 4, 45000.00, 40), (25, 5, 55000.00, 40),
(26, 4, 52000.00, 35), (26, 5, 62000.00, 35),
(27, 4, 48000.00, 40), (27, 5, 58000.00, 40);

-- 5. Tài khoản người dùng (mật khẩu: 123)
INSERT INTO users (user_name, email, password, role, status) VALUES
('admin', 'admin@thesweets.com', '$2y$10$0QZVDBb/jOeoCdhAdB4JB.Sbjc.DSuksus.QtCPiXh0oEnOFOQCc2', 'admin', 'active'),
('cus1', 'customer1@gmail.com', '$2y$10$0QZVDBb/jOeoCdhAdB4JB.Sbjc.DSuksus.QtCPiXh0oEnOFOQCc2', 'customer', 'active'),
('cus2', 'customer2@gmail.com', '$2y$10$0QZVDBb/jOeoCdhAdB4JB.Sbjc.DSuksus.QtCPiXh0oEnOFOQCc2', 'customer', 'active');

-- 6. Hồ sơ khách hàng
INSERT INTO customers (customer_id, user_name, first_name, last_name, phone, gender) VALUES
(1, 'cus1', 'Nguyễn', 'Văn An', '0912345678', 'Male'),
(2, 'cus2', 'Trần', 'Thị Bích', '0987654321', 'Female');

-- 7. Nhà cung cấp
INSERT INTO suppliers (supplier_id, supplier_code, supplier_name, contact_name, phone, email, address, status) VALUES
(1, 'NCC001', 'Xưởng Bánh Tươi Mousse & Pastry Paris', 'Trần Minh Quân', '02838123456', 'paris.pastry@gmail.com', '45 KCN Tân Thuận, Quận 7, TP.HCM', 'Active'),
(2, 'NCC002', 'Công ty Phân Phối Bánh Ngọt Sweets SG', 'Lê Thị Thu', '02839998888', 'sweetssg.bakery@gmail.com', '120 Quốc Lộ 1K, TP. Thủ Đức, TP.HCM', 'Active');

-- 8. Phiếu nhập hàng
INSERT INTO import_receipts (import_id, import_code, supplier_id, total_amount, import_date, status, notes) VALUES
(1, 'PN001', 1, 3500000.00, '2026-10-01 08:30:00', 'Completed', 'Nhập bánh Mousse tươi các vị cho tuần đầu tháng 10'),
(2, 'PN002', 2, 2100000.00, '2026-10-03 09:00:00', 'Completed', 'Nhập mẻ bánh Croissant bơ Pháp mới nướng');

-- 9. Chi tiết phiếu nhập hàng
INSERT INTO import_receipt_details (import_id, product_id, size_id, quantity, import_price, total_price, note) VALUES
(1, 1, 1, 20, 70000.00, 1400000.00, 'Bánh mousse tiramisu cỡ nhỏ'),
(1, 2, 1, 15, 75000.00, 1125000.00, 'Bánh mousse dâu tây cỡ nhỏ'),
(2, 10, 4, 100, 18000.00, 1800000.00, 'Bánh croissant bơ cao cấp');

-- 10. Chương trình khuyến mãi (CTKM)
INSERT INTO promotions (promotion_id, promotion_code, promotion_name, description, start_date, end_date, status, usage_limit_per_user, total_usage_limit) VALUES
(1, 'CTKM01', 'Ưu đãi Khách hàng Thân thiết', 'Giảm giá theo mức tổng tiền hóa đơn (1 lần/khách)', '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'Active', 1, 500),
(2, 'CTKM02', 'Tri ân Mùa Lễ Hội', 'Khuyến mãi đặc biệt mừng mùa bánh cuối năm (1 lần/khách)', '2026-10-01 00:00:00', '2026-12-31 23:59:59', 'Active', 1, 200),
(3, 'SWEET10', 'Voucher Chào Bạn Mới', 'Giảm 10% tối đa 20.000đ cho đơn từ 80.000đ (Dành cho tài khoản mới, 1 lần duy nhất)', '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'Active', 1, 1000),
(4, 'BANHNGOT', 'Tuần Lễ Bánh Ngọt', 'Giảm 15% tối đa 35.000đ cho đơn từ 150.000đ (1 lần/khách)', '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'Active', 1, 300);

-- 11. Khuyến mãi theo tổng tiền hóa đơn
INSERT INTO invoice_promotions (promotion_id, min_order_value, discount_percentage, max_discount_value) VALUES
(1, 200000.00, 10.00, 30000.00),
(1, 500000.00, 15.00, 80000.00),
(2, 300000.00, 12.00, 50000.00),
(3, 80000.00, 10.00, 20000.00),
(4, 150000.00, 15.00, 35000.00);

-- 12. Giỏ hàng
INSERT INTO cart (customer_id, product_id, size_id, quantity) VALUES
(1, 1, 1, 1),
(1, 19, 4, 2);

-- 13. Đơn hàng mẫu (Mô hình Pick-up)
INSERT INTO orders (order_id, order_code, customer_id, recipient_name, recipient_phone, pickup_time, notes, promotion_id, discount_amount, total_quantity, total_cost, final_cost, payment_method, payment_status, status, order_date) VALUES
(1, 'DH2026100101', 1, 'Nguyễn Văn An', '0912345678', '2026-10-07 18:30:00', 'Viết chữ: Chúc mừng sinh nhật An (nến số 25)', 1, 18000.00, 2, 225000.00, 207000.00, 'COD', 'Unpaid', 'Ready', '2026-10-07 17:00:00'),
(2, 'DH2026100102', 2, 'Trần Thị Bích', '0987654321', '2026-10-07 19:15:00', 'Lấy bánh nóng vừa nướng xong', NULL, 0.00, 3, 105000.00, 105000.00, 'VNPay', 'Paid', 'Processing', '2026-10-07 17:45:00'),
(3, 'DH2026100103', 1, 'Nguyễn Văn An', '0912345678', '2026-10-06 15:00:00', 'Không lấy dao nĩa nhựa', NULL, 0.00, 1, 130000.00, 130000.00, 'COD', 'Paid', 'Completed', '2026-10-06 14:00:00');

-- 14. Lịch sử khuyến mãi hóa đơn
INSERT INTO order_promotions (order_id, promotion_id, discount_amount, applied_at) VALUES
(1, 1, 18000.00, '2026-10-07 17:00:00');

-- 15. Chi tiết đơn hàng
INSERT INTO order_detail (order_id, product_id, size_id, quantity, price, note) VALUES
(1, 1, 2, 1, 190000.00, 'Size M Tiramisu Mousse'),
(1, 19, 4, 1, 35000.00, 'Trà chanh ít đường'),
(2, 10, 4, 3, 35000.00, '3 bánh sừng bò giòn'),
(3, 1, 1, 1, 130000.00, 'Size S Tiramisu Mousse');

-- 16. Nhật ký thay đổi trạng thái đơn hàng
INSERT INTO order_status_logs (order_id, changed_by, old_status, new_status, note, changed_at) VALUES
(1, 'Hệ thống', NULL, 'Pending', 'Khách hàng tạo đơn đặt bánh mới trên ứng dụng', '2026-10-07 17:00:00'),
(1, 'admin', 'Pending', 'Processing', 'Bếp tiếp nhận đơn và bắt đầu chuẩn bị bánh', '2026-10-07 17:10:00'),
(1, 'admin', 'Processing', 'Ready', 'Bánh đã làm xong và đóng hộp, sẵn sàng tại quầy', '2026-10-07 17:50:00'),
(2, 'Hệ thống', NULL, 'Pending', 'Khách thanh toán qua VNPay thành công', '2026-10-07 17:45:00'),
(2, 'admin', 'Pending', 'Processing', 'Bắt đầu nướng mẻ bánh sừng bò mới', '2026-10-07 17:55:00'),
(3, 'admin', 'Ready', 'Completed', 'Khách đã ghé quầy nhận bánh thành công', '2026-10-06 15:05:00');

-- 17. Thông báo gửi cho người dùng
INSERT INTO notifications (user_name, title, message, type, reference_id, is_read) VALUES
('cus1', 'Bánh của bạn đã sẵn sàng!', 'Đơn hàng #DH2026100101 đã hoàn thành và sẵn sàng tại quầy. Mời bạn ghé cửa hàng nhận bánh nhé!', 'order', 1, FALSE),
('cus2', 'Đang nướng bánh cho bạn', 'Đơn hàng #DH2026100102 đang được chuẩn bị. Chúng tôi sẽ thông báo ngay khi bánh ra lò.', 'order', 2, FALSE);

SET FOREIGN_KEY_CHECKS = 1;
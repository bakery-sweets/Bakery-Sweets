-- ==============================================================================
-- SEED DATA: Dữ liệu mẫu hoàn chỉnh cho Bakery-Sweets (Mô hình nhận tại quầy)
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Kích cỡ bánh
INSERT INTO size (size_id, size_name) VALUES
(1, 'Size S (16cm)'),
(2, 'Size M (20cm)'),
(3, 'Size L (24cm)');

-- 2. Danh mục sản phẩm
INSERT INTO category (category_id, category_name, description) VALUES
(1, 'Mousse Cake', 'Bánh mousse mềm mịn thanh mát, ít ngọt'),
(2, 'Croissant & Pastry', 'Bánh sừng bò ngàn lớp thơm bơ Pháp'),
(3, 'Trà & Thức Uống', 'Trà trái cây tươi mát kết hợp cùng bánh');

-- 3. Sản phẩm bánh
INSERT INTO product (product_id, product_name, category_id, status, ingredients, expiration_date, storage_instructions, image) VALUES
(1, 'Chocolate Mousse', 1, 'Available', 'Socola đen nguyên chất 70%, kem sữa tươi Anchor, gelatin, cốt bông lan', '2 ngày kể từ ngày sản xuất', 'Bảo quản ngăn mát tủ lạnh 2-6 độ C', 'chocolate_mousse.jpg'),
(2, 'Matcha Mousse', 1, 'Available', 'Bột trà xanh Uji Nhật Bản, kem tươi whipping, phô mai mascarpone', '2 ngày kể từ ngày sản xuất', 'Bảo quản ngăn mát tủ lạnh 2-6 độ C', 'matcha_mousse.jpg'),
(3, 'Butter Croissant', 2, 'Available', 'Bột mì thượng hạng Pháp, bơ lạt Elle & Vire, men tự nhiên', 'Trong ngày', 'Bảo quản nơi khô ráo, dùng ngon hơn khi hâm nóng', 'butter_croissant.jpg'),
(4, 'Trà Đào Cam Sả', 3, 'Available', 'Trà đen hảo hạng, đào ngâm giòn, cam tươi, sả tươi', 'Dùng trong ngày', 'Uống trực tiếp kèm đá', 'peach_tea.jpg');

-- 4. Biến thể bánh theo size (Giá & Tồn kho)
INSERT INTO product_sizes (product_id, size_id, price, stock_quantity) VALUES
(1, 1, 120000.00, 15),
(1, 2, 180000.00, 10),
(1, 3, 250000.00, 5),
(2, 1, 130000.00, 12),
(2, 2, 190000.00, 8),
(3, 1, 35000.00, 30),
(4, 1, 45000.00, 50);

-- 5. Tài khoản người dùng (mật khẩu mặc định: 123 - bcrypt)
INSERT INTO users (user_name, email, password, role, status) VALUES
('admin', 'admin@thesweets.com', '$2y$10$0QZVDBb/jOeoCdhAdB4JB.Sbjc.DSuksus.QtCPiXh0oEnOFOQCc2', 'admin', 'active'),
('cus1', 'customer1@gmail.com', '$2y$10$0QZVDBb/jOeoCdhAdB4JB.Sbjc.DSuksus.QtCPiXh0oEnOFOQCc2', 'customer', 'active'),
('cus2', 'customer2@gmail.com', '$2y$10$0QZVDBb/jOeoCdhAdB4JB.Sbjc.DSuksus.QtCPiXh0oEnOFOQCc2', 'customer', 'active');

-- 6. Hồ sơ khách hàng
INSERT INTO customers (customer_id, user_name, first_name, last_name, phone, gender, loyalty_points) VALUES
(1, 'cus1', 'Nguyễn', 'Văn An', '0912345678', 'Male', 50),
(2, 'cus2', 'Trần', 'Thị Bích', '0987654321', 'Female', 20);

-- 7. Nhà cung cấp
INSERT INTO suppliers (supplier_id, supplier_code, supplier_name, contact_name, phone, email, address, status) VALUES
(1, 'NCC001', 'Công ty TNHH Bơ Sữa Tân An', 'Trần Minh Quân', '02838123456', 'tanan.dairy@gmail.com', '45 KCN Tân Thuận, Quận 7, TP.HCM', 'Active'),
(2, 'NCC002', 'Đại lý Bột Mì & Đường Biên Hòa', 'Lê Thị Thu', '02839998888', 'botmi.bienhoa@gmail.com', '120 Quốc Lộ 1K, Biên Hòa, Đồng Nai', 'Active');

-- 8. Phiếu nhập hàng (Kho)
INSERT INTO import_receipts (import_id, import_code, supplier_id, total_amount, import_date, status, notes) VALUES
(1, 'PN001', 1, 3500000.00, '2026-10-01 08:30:00', 'Completed', 'Nhập kem tươi và bơ lạt Pháp cho tuần đầu tháng 10'),
(2, 'PN002', 2, 2100000.00, '2026-10-03 09:00:00', 'Completed', 'Nhập bột mì làm bánh sừng bò');

-- 9. Chi tiết phiếu nhập hàng
INSERT INTO import_receipt_details (import_id, product_id, size_id, quantity, import_price, total_price, note) VALUES
(1, 1, 1, 20, 70000.00, 1400000.00, 'Bánh mousse socola cỡ nhỏ'),
(1, 1, 2, 15, 110000.00, 1650000.00, 'Bánh mousse socola cỡ vừa'),
(2, 3, 1, 100, 18000.00, 1800000.00, 'Nguyên liệu bánh croissant');

-- 10. Chương trình khuyến mãi (CTKM)
INSERT INTO promotions (promotion_id, promotion_code, promotion_name, description, start_date, end_date, status) VALUES
(1, 'CTKM01', 'Ưu đãi Khách hàng Thân thiết', 'Giảm giá theo mức tổng tiền hóa đơn', '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'Active'),
(2, 'CTKM02', 'Tri ân Mùa Lễ Hội', 'Khuyến mãi đặc biệt mừng mùa bánh cuối năm', '2026-10-01 00:00:00', '2026-12-31 23:59:59', 'Active');

-- 11. Khuyến mãi theo tổng tiền hóa đơn: KM TTHD (MaCTKM, muc TTHD, %gg)
INSERT INTO invoice_promotions (promotion_id, min_order_value, discount_percentage, max_discount_value) VALUES
(1, 200000.00, 10.00, 30000.00),   -- Hóa đơn >= 200k giảm 10% (tối đa 30k)
(1, 500000.00, 15.00, 80000.00),   -- Hóa đơn >= 500k giảm 15% (tối đa 80k)
(2, 300000.00, 12.00, 50000.00);   -- Hóa đơn >= 300k giảm 12% (tối đa 50k)

-- 12. Giỏ hàng
INSERT INTO cart (customer_id, product_id, size_id, quantity) VALUES
(1, 1, 1, 1),
(1, 4, 1, 2);

-- 13. Đơn hàng mẫu (Mô hình nhận bánh tại quầy - Pick-up)
INSERT INTO orders (order_id, order_code, customer_id, recipient_name, recipient_phone, pickup_time, notes, promotion_id, discount_amount, total_quantity, total_cost, final_cost, payment_method, payment_status, status, order_date) VALUES
(1, 'DH2026100101', 1, 'Nguyễn Văn An', '0912345678', '2026-10-07 18:30:00', 'Viết chữ: Chúc mừng sinh nhật An (nến số 25)', 1, 18000.00, 2, 225000.00, 207000.00, 'COD', 'Unpaid', 'Ready', '2026-10-07 17:00:00'),
(2, 'DH2026100102', 2, 'Trần Thị Bích', '0987654321', '2026-10-07 19:15:00', 'Lấy bánh nóng vừa nướng xong', NULL, 0.00, 3, 105000.00, 105000.00, 'VNPay', 'Paid', 'Processing', '2026-10-07 17:45:00'),
(3, 'DH2026100103', 1, 'Nguyễn Văn An', '0912345678', '2026-10-06 15:00:00', 'Không lấy dao nĩa nhựa', NULL, 0.00, 1, 120000.00, 120000.00, 'COD', 'Paid', 'Completed', '2026-10-06 14:00:00');

-- 14. Lịch sử khuyến mãi hóa đơn
INSERT INTO order_promotions (order_id, promotion_id, discount_amount, applied_at) VALUES
(1, 1, 18000.00, '2026-10-07 17:00:00');

-- 15. Chi tiết đơn hàng
INSERT INTO order_detail (order_id, product_id, size_id, quantity, price, note) VALUES
(1, 1, 2, 1, 180000.00, 'Size M socola'),
(1, 4, 1, 1, 45000.00, 'Trà đào ít đường'),
(2, 3, 1, 3, 35000.00, '3 bánh sừng bò giòn'),
(3, 1, 1, 1, 120000.00, 'Size S socola');

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
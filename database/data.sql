-- ==============================================================================
-- SEED DATA: Dữ liệu mẫu cơ bản cho Bakery-Sweets
-- ==============================================================================

-- 1. Kích cỡ bánh
INSERT INTO size (size_name) VALUES
('Size S (16cm)'),
('Size M (20cm)'),
('Size L (24cm)');

-- 2. Danh mục bánh
INSERT INTO category (category_name) VALUES
('Mousse'),
('Croissant'),
('Drink');

-- 3. Phòng ban
INSERT INTO departments (department_name, description) VALUES
('Quản Lý',             'Điều hành và quản lý hoạt động cửa hàng'),
('Bán Hàng & Thu Ngân', 'Tư vấn, bán hàng tại quầy và online'),
('Bếp Bánh',            'Sản xuất và đóng gói các loại bánh');

-- 4. Tài khoản mẫu (password: 123 đã hash bcrypt)
INSERT INTO users (user_name, email, password, role, status) VALUES
('admin',        'admin@thesweets.com',   '$2y$10$0QZVDBb/jOeoCdhAdB4JB.Sbjc.DSuksus.QtCPiXh0oEnOFOQCc2', 'admin',    'active'),
('staff_sales1', 'sales1@thesweets.com',  '$2y$10$0QZVDBb/jOeoCdhAdB4JB.Sbjc.DSuksus.QtCPiXh0oEnOFOQCc2', 'staff',    'active'),
('cus1',         'customer1@gmail.com',   '$2y$10$0QZVDBb/jOeoCdhAdB4JB.Sbjc.DSuksus.QtCPiXh0oEnOFOQCc2', 'customer', 'active');

-- 5. Hồ sơ khách hàng
INSERT INTO customers (user_name, first_name, last_name, phone, loyalty_points) VALUES
('cus1', 'Nguyễn', 'Văn An', '0912345678', 50);

-- 6. Hồ sơ nhân viên (dùng trực tiếp cột position)
INSERT INTO employees (employee_code, user_name, first_name, last_name, phone, citizen_id, department_id, position, hire_date) VALUES
('NV001', 'staff_sales1', 'Nguyễn Thị', 'Hoa', '0909888777', '079123456789', 2, 'Nhân Viên Bán Hàng', '2025-01-10');

-- 7. Nhà cung cấp mẫu
INSERT INTO suppliers (supplier_code, supplier_name, contact_name, phone, email, address) VALUES
('NCC001', 'Công ty TNHH Bơ Sữa Tân An', 'Trần Minh Quân', '02838123456', 'tanan.dairy@gmail.com', '45 Khu chế xuất Tân Thuận, Quận 7, TP.HCM'),
('NCC002', 'Đại lý Bột Mì & Đường Biên Hòa', 'Lê Thị Thu', '02839998888', 'botmi.bienhoa@gmail.com', '120 Quốc Lộ 1K, Biên Hòa, Đồng Nai');

-- 8. Chương trình khuyến mãi (CTKM)
INSERT INTO promotions (promotion_code, promotion_name, description, start_date, end_date, status) VALUES
('CTKM01', 'Ưu đãi Giáng Sinh & Năm Mới', 'Chương trình khuyến mãi mùa lễ hội cuối năm', '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'Active'),
('CTKM02', 'Tri ân khách hàng The Sweets', 'Khuyến mãi đặc biệt giảm giá theo hóa đơn', '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'Active');

-- 9. Khuyến mãi theo tổng tiền hóa đơn: KM TTHD (MaCTKM, muc TTHD, %gg)
INSERT INTO invoice_promotions (promotion_id, min_order_value, discount_percentage, max_discount_value) VALUES
(1, 200000, 10.00, 30000),   -- Hóa đơn >= 200,000đ giảm 10% (tối đa 30,000đ)
(1, 500000, 15.00, 80000),   -- Hóa đơn >= 500,000đ giảm 15% (tối đa 80,000đ)
(2, 300000, 12.00, 50000);   -- Hóa đơn >= 300,000đ giảm 12% (tối đa 50,000đ)
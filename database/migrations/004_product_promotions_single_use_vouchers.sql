-- ==============================================================================
-- Migration 004: ưu đãi theo sản phẩm (bánh sắp hết hạn) & mã giảm giá dùng 1 lần
--   - Thêm cột order_detail.original_price (giá niêm yết trước ưu đãi sản phẩm)
--   - Thêm bảng product_promotions, single_use_vouchers
-- Áp dụng cho DB đã tạo từ createTable.sql cũ (volume Docker không chạy lại init script).
-- Chạy:  docker exec -i thesweets_db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" thesweets_db' < database/migrations/004_product_promotions_single_use_vouchers.sql
-- ==============================================================================
ALTER TABLE order_detail
    ADD COLUMN original_price DECIMAL(15, 2) NULL CHECK (original_price >= 0) AFTER price;

-- 18. Bảng product_promotions: Giảm giá trực tiếp trên sản phẩm (VD: bánh sắp hết hạn giảm 10-15%)
--     Nhiều ưu đãi cùng hiệu lực cho 1 sản phẩm/size thì lấy mức giảm cao nhất
CREATE TABLE IF NOT EXISTS product_promotions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    size_id INT NULL,
    -- NULL: áp dụng cho mọi size của sản phẩm
    discount_percentage DECIMAL(5, 2) NOT NULL CHECK (
        discount_percentage > 0
        AND discount_percentage <= 90
    ),
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    -- Với bánh sắp hết hạn: là hạn sử dụng của mẻ bánh, quá hạn thì ưu đãi tự hết hiệu lực
    status ENUM('Active', 'Paused') DEFAULT 'Active',
    note VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_promotions_lookup (product_id, status, end_date),
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE,
    FOREIGN KEY (size_id) REFERENCES size(size_id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- 19. Bảng single_use_vouchers: Mã giảm giá ngẫu nhiên 8 ký tự, mỗi mã chỉ dùng được 1 lần
--     Đặt đơn thành công -> status = 'Used'; đơn bị hủy -> mã được trả lại 'Unused'
CREATE TABLE IF NOT EXISTS single_use_vouchers (
    voucher_id INT PRIMARY KEY AUTO_INCREMENT,
    code CHAR(8) UNIQUE NOT NULL,
    -- Mã in hoa gồm chữ & số, bỏ các ký tự dễ nhầm (0/O, 1/I/L)
    discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent',
    discount_value DECIMAL(15, 2) NOT NULL CHECK (discount_value > 0),
    -- percent: % giảm (<= 100) | fixed: số tiền giảm
    max_discount_value DECIMAL(15, 2) NULL CHECK (max_discount_value >= 0),
    -- Giảm tối đa (chỉ dùng cho percent)
    min_order_value DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (min_order_value >= 0),
    expires_at DATETIME NULL,
    -- NULL: không hết hạn
    status ENUM('Unused', 'Used', 'Disabled') DEFAULT 'Unused',
    batch_name VARCHAR(255) NULL,
    -- Tên đợt phát hành (VD: Tri ân khách quen tháng 12)
    used_by_customer_id INT NULL,
    used_order_id INT NULL,
    used_at DATETIME NULL,
    created_by VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (used_by_customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL,
    FOREIGN KEY (used_order_id) REFERENCES orders(order_id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

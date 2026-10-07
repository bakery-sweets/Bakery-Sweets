-- ==============================================================================
-- HỆ THỐNG CƠ SỞ DỮ LIỆU CỬA HÀNG BÁNH "THE SWEETS"
-- Kiến trúc: Bán hàng trực tuyến (Web React + Mobile Flutter + Backend API)
-- Phiên bản: MySQL 8.0+ / MariaDB | Charset: utf8mb4_unicode_ci
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS order_status_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS order_detail;
DROP TABLE IF EXISTS order_promotions;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS import_receipt_details;
DROP TABLE IF EXISTS import_receipts;
DROP TABLE IF EXISTS invoice_promotions;
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS product_sizes;
DROP TABLE IF EXISTS product;
DROP TABLE IF EXISTS size;
DROP TABLE IF EXISTS category;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- PHẦN 1: TÀI KHOẢN XÁC THỰC
-- ==============================================================================

-- 1. Bảng users: Tài khoản đăng nhập (Chỉ lo xác thực & phân quyền)
CREATE TABLE users (
    user_name    VARCHAR(255) PRIMARY KEY,
    email        VARCHAR(255) UNIQUE NOT NULL,
    password     VARCHAR(255) NOT NULL,
    role         ENUM('customer', 'admin') DEFAULT 'customer',
    status       ENUM('active', 'locked') DEFAULT 'active',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- PHẦN 2: KHÁCH HÀNG
-- ==============================================================================

-- 2. Bảng customers: Hồ sơ thông tin cá nhân khách hàng (1-1 với users)
CREATE TABLE customers (
    customer_id    INT PRIMARY KEY AUTO_INCREMENT,
    user_name      VARCHAR(255) UNIQUE NOT NULL,
    first_name     VARCHAR(100) NOT NULL,
    last_name      VARCHAR(100) NOT NULL,
    phone          VARCHAR(20) UNIQUE,
    gender         ENUM('Male', 'Female', 'Other') DEFAULT 'Other',
    loyalty_points INT DEFAULT 0 CHECK (loyalty_points >= 0),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_name) REFERENCES users(user_name) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- PHẦN 3: NHÀ CUNG CẤP & QUẢN LÝ NHẬP HÀNG (KHO)
-- ==============================================================================

-- 3. Bảng suppliers: Nhà cung cấp nguyên vật liệu / sản phẩm bánh
CREATE TABLE suppliers (
    supplier_id    INT PRIMARY KEY AUTO_INCREMENT,
    supplier_code  VARCHAR(20) UNIQUE NOT NULL,                                -- Mã NCC: NCC001, NCC002...
    supplier_name  VARCHAR(255) NOT NULL,                                      -- Tên nhà cung cấp
    contact_name   VARCHAR(100),                                               -- Người đại diện liên hệ
    phone          VARCHAR(20) UNIQUE NOT NULL,                                -- Số điện thoại
    email          VARCHAR(255),                                               -- Email
    address        VARCHAR(255),                                               -- Địa chỉ nhà cung cấp
    status         ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng import_receipts: Phiếu nhập hàng từ nhà cung cấp
CREATE TABLE import_receipts (
    import_id       INT PRIMARY KEY AUTO_INCREMENT,
    import_code     VARCHAR(20) UNIQUE NOT NULL,                                -- Mã phiếu nhập: PN001, PN002...
    supplier_id     INT NOT NULL,                                               -- Nhà cung cấp
    total_amount    DECIMAL(20,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0), -- Tổng tiền nhập
    import_date     DATETIME DEFAULT CURRENT_TIMESTAMP,                         -- Thời gian nhập
    status          ENUM('Pending', 'Completed', 'Cancelled') DEFAULT 'Completed',
    notes           TEXT,                                                       -- Ghi chú nhập hàng
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng import_receipt_details: Chi tiết phiếu nhập hàng (sản phẩm, số lượng, giá nhập)
CREATE TABLE import_receipt_details (
    import_id     INT NOT NULL,
    product_id    INT NOT NULL,
    size_id       INT NOT NULL,
    quantity      INT NOT NULL CHECK (quantity > 0),                            -- Số lượng nhập
    import_price  DECIMAL(15,2) NOT NULL CHECK (import_price >= 0),            -- Đơn giá nhập
    total_price   DECIMAL(20,2) NOT NULL CHECK (total_price >= 0),             -- Thành tiền = quantity * import_price
    note          TEXT,
    PRIMARY KEY (import_id, product_id, size_id),
    FOREIGN KEY (import_id)  REFERENCES import_receipts(import_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(product_id)        ON DELETE CASCADE,
    FOREIGN KEY (size_id)    REFERENCES size(size_id)              ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- PHẦN 4: SẢN PHẨM & BIẾN THỂ KÍCH CỠ
-- ==============================================================================

-- 6. Bảng category: Danh mục bánh (Mousse, Croissant, Drink...)
CREATE TABLE category (
    category_id    INT PRIMARY KEY AUTO_INCREMENT,
    category_name  VARCHAR(255) UNIQUE NOT NULL,
    description    TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng size: Danh mục kích cỡ (Size S 16cm, Size M 20cm...)
CREATE TABLE size (
    size_id    INT PRIMARY KEY AUTO_INCREMENT,
    size_name  VARCHAR(50) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Bảng product: Thông tin chung của bánh
CREATE TABLE product (
    product_id             INT PRIMARY KEY AUTO_INCREMENT,
    product_name           VARCHAR(255) NOT NULL,
    category_id            INT NULL,
    status                 ENUM('Available', 'Out of Stock', 'Discontinued', 'Hidden') DEFAULT 'Available',
    ingredients            TEXT,                                               -- Thành phần nguyên liệu
    expiration_date        TEXT,                                               -- Hạn sử dụng
    storage_instructions   TEXT,                                               -- Cách bảo quản
    image                  VARCHAR(255),
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES category(category_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Bảng product_sizes: Biến thể bánh theo size (Giá bán & Tồn kho riêng từng size)
CREATE TABLE product_sizes (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    product_id      INT NOT NULL,
    size_id         INT NOT NULL,
    price           DECIMAL(15,2) NOT NULL CHECK (price >= 0),
    stock_quantity  INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    UNIQUE KEY unique_product_size (product_id, size_id),
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE,
    FOREIGN KEY (size_id)    REFERENCES size(size_id)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- PHẦN 5: CHƯƠNG TRÌNH KHUYẾN MÃI & KHUYẾN MÃI THEO HÓA ĐƠN
-- ==============================================================================

-- 10. Bảng promotions (CTKM): Chương trình khuyến mãi chung (Bảng cha)
CREATE TABLE promotions (
    promotion_id    INT PRIMARY KEY AUTO_INCREMENT,                             -- MaCTKM: Khóa chính
    promotion_code  VARCHAR(50) UNIQUE NOT NULL,                                -- Mã code chương trình (VD: CTKM01, TET2026...)
    promotion_name  VARCHAR(255) NOT NULL,                                      -- Tên chương trình khuyến mãi
    description     TEXT,                                                       -- Mô tả chương trình
    start_date      DATETIME NOT NULL,                                          -- Ngày bắt đầu
    end_date        DATETIME NOT NULL,                                          -- Ngày kết thúc
    status          ENUM('Draft', 'Active', 'Paused', 'Expired') DEFAULT 'Active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Bảng invoice_promotions (KM TTHD): Khuyến mãi theo mức tổng tiền hóa đơn
--     Sơ đồ: KM TTHD (MaCTKM, muc TTHD, %gg)
CREATE TABLE invoice_promotions (
    promotion_id        INT NOT NULL,                                            -- MaCTKM: Khóa ngoại tham chiếu promotions
    min_order_value     DECIMAL(15,2) NOT NULL CHECK (min_order_value >= 0),     -- muc TTHD: Mức tổng tiền hóa đơn tối thiểu
    discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100), -- %gg: Phần trăm giảm giá
    max_discount_value  DECIMAL(15,2) NULL CHECK (max_discount_value >= 0),      -- Số tiền giảm tối đa (nếu có)
    PRIMARY KEY (promotion_id, min_order_value),
    FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- PHẦN 6: GIỎ HÀNG & ĐƠN HÀNG (HÓA ĐƠN)
-- ==============================================================================

-- 12. Bảng cart: Giỏ hàng của khách hàng (lưu rõ size bánh đã chọn)
CREATE TABLE cart (
    cart_id     INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    product_id  INT NOT NULL,
    size_id     INT NOT NULL,
    quantity    INT NOT NULL CHECK (quantity > 0),
    added_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id)  REFERENCES product(product_id)    ON DELETE CASCADE,
    FOREIGN KEY (size_id)     REFERENCES size(size_id)          ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Bảng orders: Quản lý đơn hàng (Tập trung bán hàng & giao hàng cho khách)
CREATE TABLE orders (
    order_id           INT PRIMARY KEY AUTO_INCREMENT,
    order_code         VARCHAR(20) UNIQUE NULL,                                 -- Mã đơn: DH001...
    customer_id        INT NOT NULL,                                            -- Khách hàng đặt mua
    recipient_name     VARCHAR(100) NOT NULL,                                   -- Họ tên người nhận hàng
    recipient_phone    VARCHAR(20) NOT NULL,                                    -- Số điện thoại người nhận
    shipping_address   VARCHAR(255) NOT NULL,                                   -- Địa chỉ giao hàng cụ thể (số nhà, tên đường, phường, quận, tỉnh)
    shipping_city      VARCHAR(100) NULL,                                       -- Tỉnh / Thành phố
    shipping_district  VARCHAR(100) NULL,                                       -- Quận / Huyện
    shipping_ward      VARCHAR(100) NULL,                                       -- Phường / Xã
    delivery_date      DATE NULL,                                               -- Ngày mong muốn nhận
    delivery_time      TIME NULL,                                               -- Giờ mong muốn nhận
    shipping_fee       DECIMAL(10,2) DEFAULT 0 CHECK (shipping_fee >= 0),       -- Phí vận chuyển
    notes              TEXT,                                                    -- Ghi chú giao hàng
    promotion_id       INT NULL,                                                -- Mã chương trình khuyến mãi áp dụng cho hóa đơn
    discount_amount    DECIMAL(15,2) DEFAULT 0 CHECK (discount_amount >= 0),    -- Số tiền được giảm giá trên hóa đơn
    total_quantity     INT NOT NULL DEFAULT 1 CHECK (total_quantity > 0),       -- Tổng số lượng bánh trong đơn
    total_cost         DECIMAL(20,2) NOT NULL CHECK (total_cost >= 0),          -- Tổng tiền hàng trước giảm giá
    final_cost         DECIMAL(20,2) NOT NULL CHECK (final_cost >= 0),          -- Tổng tiền thanh toán cuối cùng = total_cost + shipping_fee - discount_amount
    payment_method     ENUM('COD', 'Momo', 'Credit Card', 'VNPay') DEFAULT 'COD',
    payment_status     ENUM('Unpaid', 'Paid', 'Refunded') DEFAULT 'Unpaid',
    status             ENUM('Pending', 'Processing', 'Shipping', 'Completed', 'Cancelled') DEFAULT 'Pending',
    order_date         DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id)  REFERENCES customers(customer_id)   ON DELETE CASCADE,
    FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Bảng order_promotions: Nhật ký khuyến mãi áp dụng cho từng hóa đơn
CREATE TABLE order_promotions (
    id               INT PRIMARY KEY AUTO_INCREMENT,
    order_id         INT NOT NULL,
    promotion_id     INT NOT NULL,
    discount_amount  DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0), -- Số tiền giảm thực tế trên hóa đơn
    applied_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id)     REFERENCES orders(order_id)         ON DELETE CASCADE,
    FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Bảng order_detail: Chi tiết từng món bánh trong đơn hàng
CREATE TABLE order_detail (
    order_id    INT NOT NULL,
    product_id  INT NOT NULL,
    size_id     INT NOT NULL,
    quantity    INT NOT NULL CHECK (quantity > 0),
    price       DECIMAL(15,2) NOT NULL CHECK (price >= 0),                  -- Đơn giá tại thời điểm đặt hàng
    note        TEXT,
    PRIMARY KEY (order_id, product_id, size_id),
    FOREIGN KEY (order_id)   REFERENCES orders(order_id)   ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(product_id)        ON DELETE CASCADE,
    FOREIGN KEY (size_id)    REFERENCES size(size_id)              ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- PHẦN 7: THÔNG BÁO & LỊCH SỬ THAY ĐỔI TRẠNG THÁI
-- ==============================================================================

-- 16. Bảng notifications: Thông báo đẩy cho Web & Mobile
CREATE TABLE notifications (
    notification_id  INT PRIMARY KEY AUTO_INCREMENT,
    user_name        VARCHAR(255) NOT NULL,
    title            VARCHAR(255) NOT NULL,
    message          TEXT NOT NULL,
    type             ENUM('order', 'system', 'promotion') DEFAULT 'order',
    reference_id     INT NULL,                                                  -- order_id nếu type = 'order'
    is_read          BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_name) REFERENCES users(user_name) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Bảng order_status_logs: Lịch sử thay đổi trạng thái đơn hàng
CREATE TABLE order_status_logs (
    log_id       INT PRIMARY KEY AUTO_INCREMENT,
    order_id     INT NOT NULL,
    changed_by   VARCHAR(100) NULL,                                             -- Người thao tác (Khách hàng, Admin, Hệ thống)
    old_status   ENUM('Pending', 'Processing', 'Shipping', 'Completed', 'Cancelled') NULL,
    new_status   ENUM('Pending', 'Processing', 'Shipping', 'Completed', 'Cancelled') NOT NULL,
    note         TEXT,                                                          -- Lý do hủy, ghi chú xử lý...
    changed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

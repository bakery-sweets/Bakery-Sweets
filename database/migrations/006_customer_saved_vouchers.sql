-- ==============================================================================
-- Migration 006: ví voucher — khách đã đăng nhập nhập mã dùng 1 lần thì mã được lưu vào tài khoản
-- (khách chưa đăng nhập chỉ nhớ tạm trên trình duyệt, không lưu vào DB).
-- Chạy:  docker exec -i thesweets_db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" thesweets_db' < database/migrations/006_customer_saved_vouchers.sql
-- ==============================================================================
-- 20. Bảng customer_saved_vouchers: Mã dùng 1 lần khách đã nhập & lưu vào tài khoản (ví voucher)
--     Chỉ hiển thị mã còn dùng được (Unused, chưa hết hạn); đơn dùng mã bị hủy -> mã hiện lại trong ví
CREATE TABLE IF NOT EXISTS customer_saved_vouchers (
    customer_id INT NOT NULL,
    voucher_id INT NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id, voucher_id),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (voucher_id) REFERENCES single_use_vouchers(voucher_id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

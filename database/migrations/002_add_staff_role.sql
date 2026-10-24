-- ==============================================================================
-- Migration 002: thêm vai trò 'staff' (nhân viên - chỉ được quản lý đơn hàng) cho bảng users
-- Áp dụng cho DB đã tạo từ createTable.sql cũ (volume Docker không chạy lại init script).
-- Chạy:  docker exec -i thesweets_db mysql -uroot -proot thesweets_db < database/migrations/002_add_staff_role.sql
-- ==============================================================================
ALTER TABLE users
    MODIFY role ENUM('customer', 'admin', 'staff') DEFAULT 'customer';

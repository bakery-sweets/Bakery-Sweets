-- ==============================================================================
-- Migration 003: thêm cột 'lock_reason' lưu lý do khi khóa tài khoản
-- Áp dụng cho bảng users trong database thesweets_db
-- ==============================================================================
ALTER TABLE users
    ADD COLUMN lock_reason VARCHAR(255) DEFAULT NULL AFTER status;

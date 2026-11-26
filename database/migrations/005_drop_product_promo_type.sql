-- ==============================================================================
-- Migration 005: gộp mọi khuyến mãi sản phẩm thành một loại "Khuyến mãi"
--   Bỏ cột product_promotions.promo_type (NearExpiry / Regular): khách không được thấy lý do khuyến mãi;
--   lý do (VD: mẻ bánh sắp hết hạn) ghi ở cột note, chỉ admin xem.
-- Chỉ cần chạy nếu DB đã chạy bản cũ của migration 004 (bảng product_promotions còn cột promo_type).
-- Chạy:  docker exec -i thesweets_db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" thesweets_db' < database/migrations/005_drop_product_promo_type.sql
-- ==============================================================================
ALTER TABLE product_promotions DROP COLUMN IF EXISTS promo_type;

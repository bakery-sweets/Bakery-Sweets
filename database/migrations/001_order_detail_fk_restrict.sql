-- ==============================================================================
-- Migration 001: đổi khóa ngoại order_detail -> product/size sang ON DELETE RESTRICT
-- Áp dụng cho DB đã tạo từ createTable.sql cũ (volume Docker không chạy lại init script).
-- Chạy:  docker exec -i thesweets_db mysql -uroot -proot thesweets_db < database/migrations/001_order_detail_fk_restrict.sql
-- Tên ràng buộc order_detail_ibfk_2/3 là tên MariaDB tự sinh theo thứ tự khai báo trong createTable.sql.
-- ==============================================================================
ALTER TABLE order_detail
    DROP FOREIGN KEY order_detail_ibfk_2,
    DROP FOREIGN KEY order_detail_ibfk_3;

ALTER TABLE order_detail
    ADD CONSTRAINT order_detail_ibfk_2 FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE RESTRICT,
    ADD CONSTRAINT order_detail_ibfk_3 FOREIGN KEY (size_id) REFERENCES size(size_id) ON DELETE RESTRICT;

// Tiện ích tồn kho phía khách: không hiện số tồn thật, chỉ báo khi sắp hết hoặc hết hàng

// Dưới ngưỡng này mới báo "sắp hết" cho khách
export const LOW_STOCK_THRESHOLD = 10;

export const sizeStock = (size) => Number(size?.stock_quantity) || 0;

export const productStock = (product) =>
  product?.sizes?.reduce((sum, s) => sum + sizeStock(s), 0) ?? 0;

export const isLowStock = (stock) => stock > 0 && stock < LOW_STOCK_THRESHOLD;

// Size rẻ nhất còn hàng, dùng cho nút "Thêm vào giỏ" nhanh
export const cheapestAvailableSize = (product) =>
  (product?.sizes || [])
    .filter((s) => sizeStock(s) > 0)
    .reduce((min, s) => (!min || Number(s.price) < Number(min.price) ? s : min), null);

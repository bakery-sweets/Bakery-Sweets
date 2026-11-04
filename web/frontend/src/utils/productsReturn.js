// Ngữ cảnh "quay lại danh sách": lưu khi khách mở chi tiết bánh từ trang /products,
// dùng một lần để trang Products khôi phục bộ lọc, trang phân trang và cuộn về đúng thẻ bánh.
const KEY = 'products_return_context';

export function saveProductsReturn(context) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...context, scrollY: window.scrollY }));
  } catch {
    // sessionStorage bị chặn (chế độ riêng tư...): bỏ qua, chỉ mất tính năng cuộn lại
  }
}

export function readProductsReturn() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearProductsReturn() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // bỏ qua
  }
}

// Backend trả giá dạng chuỗi Decimal ("130000.00") nên luôn ép về Number trước khi format
export const formatVND = (value, unit = "₫") =>
  `${Number(value || 0).toLocaleString("vi-VN")}${unit}`;

// Hiển thị số lượng: nếu vượt quá 20 thì để 20+
export const formatStock = (value) => {
  if (value === null || value === undefined || value === "") return "0";
  if (typeof value === "string" && value.includes("+")) return value;
  const num = Number(value);
  if (isNaN(num) || num <= 0) return "0";
  if (num > 20) return "20+";
  return String(num);
};

// DB lưu ảnh dạng "/uploads/Mousse/x.jpg"; frontend phục vụ cùng file ở "/assets/Img/Mousse/x.jpg"
// Các ảnh mới tải lên từ máy được phục vụ bởi Backend qua http://localhost:5000/uploads/...
export const imageUrl = (path) => {
  if (!path) return "/assets/Img/Sweets1.png";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  const staticCategories = [
    "/uploads/Mousse/",
    "/uploads/Croissant/",
    "/uploads/Pay_final/",
  ];
  if (staticCategories.some((cat) => path.startsWith(cat))) {
    return path.replace(/^\/uploads\//, "/assets/Img/");
  }
  if (path.startsWith("/uploads/")) {
    return `http://localhost:5000${path}`;
  }
  return path;
};

export const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString("vi-VN") : "—");

// Ngày theo giờ địa phương dạng YYYY-MM-DD (toISOString() trả ngày UTC, lệch 7 tiếng ở VN)
export const toLocalDateInput = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const apiErrorMessage = (err, fallback = "Có lỗi xảy ra, vui lòng thử lại.") => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join("\n");
  return fallback;
};

export const ORDER_STATUS = {
  Pending: { label: "Chờ tiếp nhận", badge: "pink", dot: "pink" },
  Processing: { label: "Đang chuẩn bị", badge: "amber", dot: "orange" },
  Ready: { label: "Sẵn sàng tại quầy", badge: "cyan", dot: "green" },
  Completed: { label: "Hoàn tất", badge: "mint", dot: "green" },
  Cancelled: { label: "Đã hủy", badge: "gray", dot: "orange" },
};

export const PAYMENT_METHOD = {
  COD: "Tiền mặt",
  Banking: "Chuyển khoản",
  Momo: "Momo",
  "Credit Card": "Thẻ tín dụng",
  VNPay: "VNPay",
};

export const PAYMENT_STATUS = {
  Unpaid: "Chưa thanh toán",
  Paid: "Đã thanh toán",
  Refunded: "Đã hoàn tiền",
};

export const PRODUCT_STATUS = {
  Available: "Đang bán",
  "Out of Stock": "Hết hàng",
  Discontinued: "Ngừng kinh doanh",
  Hidden: "Đang ẩn",
};

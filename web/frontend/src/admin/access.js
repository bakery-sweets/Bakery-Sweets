// Phân quyền trang quản trị: nhân viên (staff) chỉ được vào Quản lý đơn hàng, các mục còn lại chỉ dành cho admin
export const BACKOFFICE_ROLES = ["admin", "staff"];
export const ADMIN_ONLY = ["admin"];

export const ROLE_LABELS = {
  admin: "Quản lý vận hành",
  staff: "Nhân viên đơn hàng",
};

// Trang đích sau khi đăng nhập, hoặc khi mở một trang không đủ quyền
export const homePathFor = (role) => (role === "staff" ? "/admin/orders" : "/admin");

export const NAV_ITEMS = [
  { to: "/admin", label: "Tổng Quan", icon: "grid-outline", end: true, roles: ADMIN_ONLY },
  { to: "/admin/products", label: "Danh Mục Bánh", icon: "book-outline", roles: ADMIN_ONLY },
  { to: "/admin/orders", label: "Quản Lý Đơn Hàng", icon: "receipt-outline", roles: BACKOFFICE_ROLES },
  { to: "/admin/imports", label: "Phiếu Nhập Hàng", icon: "cube-outline", roles: ADMIN_ONLY },
  { to: "/admin/vouchers", label: "Quản Lý Voucher", icon: "pricetags-outline", roles: ADMIN_ONLY },
  { to: "/admin/statistical", label: "Báo Cáo Doanh Thu", icon: "bar-chart-outline", roles: ADMIN_ONLY },
  { to: "/admin/users", label: "Tài Khoản & Quyền", icon: "shield-checkmark-outline", roles: ADMIN_ONLY },
];

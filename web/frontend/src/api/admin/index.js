import axiosClient from "../axiosClient";

// Gửi file Excel lên endpoint xem trước (chỉ đọc & kiểm tra, chưa ghi CSDL)
const uploadExcel = (url, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosClient.post(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30000,
  });
};

export const adminAuthApi = {
  // credentials: { username: số điện thoại hoặc email, password }
  login: (credentials) => axiosClient.post("/admin/auth/login", credentials),
  getProfile: () => axiosClient.get("/admin/auth/me"),
  logout: () => axiosClient.post("/admin/auth/logout"),
};

export const adminDashboardApi = {
  getOverview: () => axiosClient.get("/admin/dashboard/overview"),
};

export const adminProductsApi = {
  getAll: (params) => axiosClient.get("/admin/products", { params }),
  getById: (id) => axiosClient.get(`/admin/products/${id}`),
  create: (data) => axiosClient.post("/admin/products", data),
  update: (id, data) => axiosClient.put(`/admin/products/${id}`, data),
  delete: (id) => axiosClient.delete(`/admin/products/${id}`),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosClient.post("/admin/products/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  // Cập nhật giá bán hàng loạt từ Excel: tải mẫu (Blob) -> xem trước thay đổi -> áp dụng
  downloadPriceTemplate: () => axiosClient.get("/admin/products/prices/excel/template", { responseType: "blob" }),
  previewPriceExcel: (file) => uploadExcel("/admin/products/prices/excel/preview", file),
  // items: [{ product_id, size_id, price, old_price }]
  bulkUpdatePrices: (items) => axiosClient.patch("/admin/products/prices", { items }),
};

export const adminOrdersApi = {
  getAll: (params) => axiosClient.get("/admin/orders", { params }),
  getById: (id) => axiosClient.get(`/admin/orders/${id}`),
  updateStatus: (id, status, note) => axiosClient.patch(`/admin/orders/${id}/status`, { status, note }),
  confirmPayment: (id, note) => axiosClient.patch(`/admin/orders/${id}/payment`, { note }),
  // Hóa đơn bán hàng PDF (trả về Blob)
  exportInvoice: (id) => axiosClient.get(`/admin/orders/${id}/invoice`, { responseType: "blob" }),
  // Tạo đơn tại quầy (POS) cho nhân viên & admin
  create: (data) => axiosClient.post("/admin/orders", data),
  lookupCustomer: (phone) => axiosClient.get("/admin/orders/customer-lookup", { params: { phone } }),
  getCatalog: () => axiosClient.get("/admin/orders/catalog"),
  checkVoucher: (data) => axiosClient.post("/admin/orders/voucher-check", data),
};

export const adminUsersApi = {
  getAll: (params) => axiosClient.get("/admin/users", { params }),
  create: (data) => axiosClient.post("/admin/users", data),
  update: (phone, data) => axiosClient.patch(`/admin/users/${phone}`, data),
  toggleStatus: (phone, data) => axiosClient.patch(`/admin/users/${phone}/status`, data),
};

export const adminStatisticalApi = {
  getOverview: () => axiosClient.get("/admin/statistical/overview"),
  // params: { from_date, to_date (YYYY-MM-DD), time_from_date, time_to_date (thu - chi theo ngày), time_year (thu - chi theo tháng / quý), group_by: day | month | quarter | year, detail_from_date, detail_to_date, detail_group_by: day | month | quarter | year (bảng nhân viên / khách hàng / sản phẩm) }
  getReport: (params) => axiosClient.get("/admin/statistical/report", { params }),
  // Báo cáo doanh thu dạng Excel (trả về Blob)
  exportReport: (params) => axiosClient.get("/admin/statistical/report/export", { params, responseType: "blob" }),
};

export const adminImportReceiptsApi = {
  getAll: (params) => axiosClient.get("/admin/import-receipts", { params }),
  getSuppliers: () => axiosClient.get("/admin/import-receipts/suppliers"),
  create: (data) => axiosClient.post("/admin/import-receipts", data),
  updateStatus: (id, status) => axiosClient.patch(`/admin/import-receipts/${id}/status`, { status }),
  // Phiếu nhập kho PDF (trả về Blob)
  exportPdf: (id) => axiosClient.get(`/admin/import-receipts/${id}/pdf`, { responseType: "blob" }),
  // Nhập phiếu từ Excel: tải mẫu (Blob) -> đọc file thành các dòng để điền vào form tạo phiếu
  downloadExcelTemplate: () => axiosClient.get("/admin/import-receipts/excel/template", { responseType: "blob" }),
  previewExcel: (file) => uploadExcel("/admin/import-receipts/excel/preview", file),
};

export const adminPromotionsApi = {
  getAll: () => axiosClient.get("/admin/promotions"),
  create: (data) => axiosClient.post("/admin/promotions", data),
  update: (id, data) => axiosClient.put(`/admin/promotions/${id}`, data),
  updateStatus: (id, status) => axiosClient.patch(`/admin/promotions/${id}/status`, { status }),
};

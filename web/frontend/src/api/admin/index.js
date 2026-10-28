import axiosClient from "../axiosClient";

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
};

export const adminOrdersApi = {
  getAll: (params) => axiosClient.get("/admin/orders", { params }),
  getById: (id) => axiosClient.get(`/admin/orders/${id}`),
  updateStatus: (id, status, note) => axiosClient.patch(`/admin/orders/${id}/status`, { status, note }),
  confirmPayment: (id, note) => axiosClient.patch(`/admin/orders/${id}/payment`, { note }),
  // Hóa đơn bán hàng PDF (trả về Blob)
  exportInvoice: (id) => axiosClient.get(`/admin/orders/${id}/invoice`, { responseType: "blob" }),
};

export const adminUsersApi = {
  getAll: (params) => axiosClient.get("/admin/users", { params }),
  create: (data) => axiosClient.post("/admin/users", data),
  update: (phone, data) => axiosClient.patch(`/admin/users/${phone}`, data),
  toggleStatus: (phone, data) => axiosClient.patch(`/admin/users/${phone}/status`, data),
};

export const adminStatisticalApi = {
  getOverview: () => axiosClient.get("/admin/statistical/overview"),
  // period: today | week | month | quarter | year
  getReport: (period) => axiosClient.get("/admin/statistical/report", { params: { period } }),
  // Báo cáo doanh thu dạng Excel (trả về Blob)
  exportReport: (period) => axiosClient.get("/admin/statistical/report/export", { params: { period }, responseType: "blob" }),
};

export const adminImportReceiptsApi = {
  getAll: (params) => axiosClient.get("/admin/import-receipts", { params }),
  getSuppliers: () => axiosClient.get("/admin/import-receipts/suppliers"),
  create: (data) => axiosClient.post("/admin/import-receipts", data),
  updateStatus: (id, status) => axiosClient.patch(`/admin/import-receipts/${id}/status`, { status }),
  // Phiếu nhập kho PDF (trả về Blob)
  exportPdf: (id) => axiosClient.get(`/admin/import-receipts/${id}/pdf`, { responseType: "blob" }),
};

export const adminPromotionsApi = {
  getAll: () => axiosClient.get("/admin/promotions"),
  create: (data) => axiosClient.post("/admin/promotions", data),
  update: (id, data) => axiosClient.put(`/admin/promotions/${id}`, data),
  updateStatus: (id, status) => axiosClient.patch(`/admin/promotions/${id}/status`, { status }),
};

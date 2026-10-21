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
};

export const adminUsersApi = {
  getAll: (params) => axiosClient.get("/admin/users", { params }),
  toggleStatus: (phone) => axiosClient.patch(`/admin/users/${phone}/status`),
};

export const adminStatisticalApi = {
  getOverview: () => axiosClient.get("/admin/statistical/overview"),
};

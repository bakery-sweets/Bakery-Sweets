import axiosClient from "../axiosClient";

export const adminAuthApi = {
  login: (credentials) => axiosClient.post("/admin/auth/login", credentials),
  getProfile: () => axiosClient.get("/admin/auth/me"),
  logout: () => axiosClient.post("/admin/auth/logout"),
};

export const adminProductsApi = {
  getAll: (params) => axiosClient.get("/admin/products", { params }),
  getById: (id) => axiosClient.get(`/admin/products/${id}`),
  create: (data) => axiosClient.post("/admin/products", data),
  update: (id, data) => axiosClient.put(`/admin/products/${id}`, data),
  delete: (id) => axiosClient.delete(`/admin/products/${id}`),
};

export const adminOrdersApi = {
  getAll: (params) => axiosClient.get("/admin/orders", { params }),
  getById: (id) => axiosClient.get(`/admin/orders/${id}`),
  updateStatus: (id, status) => axiosClient.patch(`/admin/orders/${id}/status`, { status }),
};

export const adminEmployeesApi = {
  getAll: (params) => axiosClient.get("/admin/employees", { params }),
  getById: (id) => axiosClient.get(`/admin/employees/${id}`),
  create: (data) => axiosClient.post("/admin/employees", data),
  update: (id, data) => axiosClient.put(`/admin/employees/${id}`, data),
  delete: (id) => axiosClient.delete(`/admin/employees/${id}`),
};

export const adminUsersApi = {
  getAll: (params) => axiosClient.get("/admin/users", { params }),
  getById: (id) => axiosClient.get(`/admin/users/${id}`),
  toggleStatus: (id) => axiosClient.patch(`/admin/users/${id}/status`),
};

export const adminStatisticalApi = {
  getOverview: () => axiosClient.get("/admin/statistical/overview"),
  getRevenue: (params) => axiosClient.get("/admin/statistical/revenue", { params }),
  getTopProducts: (params) => axiosClient.get("/admin/statistical/top-products", { params }),
};

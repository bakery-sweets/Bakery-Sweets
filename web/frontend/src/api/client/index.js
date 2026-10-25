import axiosClient from "../axiosClient";

export const clientAuthApi = {
  login: (credentials) => axiosClient.post("/client/auth/login", credentials),
  register: (userData) => axiosClient.post("/client/auth/register", userData),
  getProfile: () => axiosClient.get("/client/auth/me"),
  updateProfile: (data) => axiosClient.put("/client/profile", data),
};

export const clientProductsApi = {
  // params: { category, search }
  getAll: (params) => axiosClient.get("/client/products", { params }),
  getById: (id) => axiosClient.get(`/client/products/${id}`),
  getCategories: () => axiosClient.get("/client/products/categories"),
  getBestSellers: (limit = 4) => axiosClient.get("/client/products/best-sellers", { params: { limit } }),
};

export const clientCartApi = {
  getCart: () => axiosClient.get("/client/cart"),
  addToCart: (item) => axiosClient.post("/client/cart/items", item),
  updateItem: (itemId, quantity) => axiosClient.put(`/client/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId) => axiosClient.delete(`/client/cart/items/${itemId}`),
  clearCart: () => axiosClient.delete("/client/cart"),
};

export const clientOrdersApi = {
  createOrder: (orderData) => axiosClient.post("/client/orders", orderData),
  getMyOrders: () => axiosClient.get("/client/orders"),
  getOrderById: (id) => axiosClient.get(`/client/orders/${id}`),
  cancelOrder: (id, data) => axiosClient.put(`/client/orders/${id}/cancel`, data),
};

export const clientPromotionsApi = {
  getAll: () => axiosClient.get("/client/promotions"),
  apply: (data) => axiosClient.post("/client/promotions/apply", data),
};


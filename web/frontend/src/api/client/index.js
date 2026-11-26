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
  // Bánh đang khuyến mãi (mức giảm cao hơn lên trước)
  getDeals: () => axiosClient.get("/client/products/deals"),
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
  // Đặt hàng không đăng nhập: gửi kèm customer_name, customer_phone và items của giỏ tạm
  createGuestOrder: (orderData) => axiosClient.post("/client/orders/guest", orderData),
  // Hóa đơn PDF của đơn đặt không đăng nhập: dùng invoice_token trả về lúc đặt hàng (trả về Blob)
  downloadGuestInvoice: (id, token) =>
    axiosClient.get(`/client/orders/guest/${id}/invoice`, { params: { token }, responseType: "blob" }),
  getMyOrders: () => axiosClient.get("/client/orders"),
  getOrderById: (id) => axiosClient.get(`/client/orders/${id}`),
  cancelOrder: (id, data) => axiosClient.put(`/client/orders/${id}/cancel`, data),
  // Hóa đơn PDF của đơn hàng (trả về Blob)
  downloadInvoice: (id) => axiosClient.get(`/client/orders/${id}/invoice`, { responseType: "blob" }),
};

export const clientPromotionsApi = {
  getAll: () => axiosClient.get("/client/promotions"),
  apply: (data) => axiosClient.post("/client/promotions/apply", data),
  // Ví voucher (chỉ khách đã đăng nhập): mã dùng 1 lần đã nhập được lưu vào tài khoản, tự ẩn khi đã dùng
  getSaved: () => axiosClient.get("/client/promotions/saved"),
  saveVoucher: (code) => axiosClient.post("/client/promotions/saved", { code }),
  removeSaved: (voucherId) => axiosClient.delete(`/client/promotions/saved/${voucherId}`),
};


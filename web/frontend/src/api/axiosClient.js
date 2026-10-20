import axios from "axios";
import BASE_URL from "./config";
import useAuthStore from "../store/authStore";
import useAdminAuthStore from "../store/adminAuthStore";

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// API /admin/* dùng token quản trị, còn lại dùng token khách hàng
const authStoreFor = (url = "") => (url.startsWith("/admin") ? useAdminAuthStore : useAuthStore);

// Request Interceptor: Tự động đính kèm Bearer JWT Token vào header
axiosClient.interceptors.request.use(
  (config) => {
    const token = authStoreFor(config.url).getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Trả về data trực tiếp, token hết hạn thì đăng xuất phiên tương ứng
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      const store = authStoreFor(error.config?.url);
      if (store.getState().token) {
        console.warn("Phiên đăng nhập đã hết hạn hoặc không có quyền truy cập.");
        store.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;

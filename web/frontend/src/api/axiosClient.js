import axios from "axios";
import BASE_URL from "./config";

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Request Interceptor: Tự động đính kèm Bearer JWT Token vào header
axiosClient.interceptors.request.use(
  (config) => {
    try {
      const authData = localStorage.getItem("auth-storage");
      if (authData) {
        const parsed = JSON.parse(authData);
        const token = parsed?.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // Bỏ qua lỗi đọc localStorage nếu có
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Trả về data trực tiếp hoặc xử lý lỗi tập trung
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Có thể kích hoạt logout hoặc redirect nếu token hết hạn
      console.warn("Phiên đăng nhập đã hết hạn hoặc không có quyền truy cập.");
    }
    return Promise.reject(error);
  }
);

export default axiosClient;

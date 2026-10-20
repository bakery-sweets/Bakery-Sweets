import { create } from "zustand";
import { persist } from "zustand/middleware";

// Phiên đăng nhập trang quản trị, tách khỏi phiên khách hàng để hai bên không ghi đè nhau
const useAdminAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: "admin-auth-storage" }
  )
);

export default useAdminAuthStore;

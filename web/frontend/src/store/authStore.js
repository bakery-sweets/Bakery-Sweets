import { create } from "zustand";
import { persist } from "zustand/middleware";

// Phiên đăng nhập của khách hàng (trang bán hàng). Admin dùng adminAuthStore riêng.
const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: "auth-storage" }
  )
);

export default useAuthStore;

import { Navigate, Outlet } from "react-router-dom";
import useAdminAuthStore from "../../store/adminAuthStore";

export default function AdminRoute() {
  const { user, token } = useAdminAuthStore();

  // Kiểm tra nếu chưa đăng nhập hoặc không phải admin -> Đẩy sang trang /admin/login
  if (!token || user?.role !== "admin") {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}

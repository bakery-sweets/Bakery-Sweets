import { Navigate, Outlet } from "react-router-dom";
import useAdminAuthStore from "../../store/adminAuthStore";
import { BACKOFFICE_ROLES, homePathFor } from "../access";

export default function AdminRoute({ roles = BACKOFFICE_ROLES }) {
  const { user, token } = useAdminAuthStore();

  // Kiểm tra nếu chưa đăng nhập hoặc không phải admin/nhân viên -> Đẩy sang trang /admin/login
  if (!token || !BACKOFFICE_ROLES.includes(user?.role)) {
    return <Navigate to="/admin/login" replace />;
  }

  // Đã đăng nhập nhưng không đủ quyền vào trang này (VD: nhân viên mở /admin/products) -> về trang của mình
  if (!roles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }

  return <Outlet />;
}

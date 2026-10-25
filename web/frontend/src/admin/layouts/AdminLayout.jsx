import { Outlet, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import useAdminUIStore from "../../store/adminUIStore";
import useAdminAuthStore from "../../store/adminAuthStore";
import { useRealtimeConnection, useRealtimeEvent } from "../../realtime/useRealtime";
import { playNotificationSound } from "../../realtime/sound";
import { formatVND } from "../../utils/format";
import popup from "../../utils/popup";
import "./AdminLayout.css";

export default function AdminLayout() {
  const { sidebarOpen, closeSidebar } = useAdminUIStore();
  const navigate = useNavigate();
  const token = useAdminAuthStore((s) => s.token);

  // Kết nối realtime bằng token quản trị để nhận sự kiện dành cho nhân viên
  useRealtimeConnection(token);

  useRealtimeEvent("new_order", (e) => {
    playNotificationSound();
    const source = e.source === "mobile" ? " · đặt từ App" : "";
    popup.info(`#${e.order_code} · ${e.recipient_name} · ${formatVND(e.final_cost)}${source}`, {
      title: "Có đơn hàng mới",
      duration: 8000,
    });
  });

  useRealtimeEvent("account_locked", (e) => {
    useAdminAuthStore.getState().logout();
    navigate("/admin/login");
    popup.alert({
      type: "danger",
      title: "Tài khoản đã bị khóa",
      message: e.reason ? `Lý do: ${e.reason}` : "Vui lòng liên hệ quản trị viên.",
    });
  });

  return (
    <div className={`admin-wrapper ${sidebarOpen ? "sidebar-open" : ""}`}>
      {/* Lớp nền mờ (Backdrop overlay) khi mở Sidebar trên Mobile & iPad */}
      {sidebarOpen && (
        <div 
          className="admin-sidebar-backdrop" 
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <AdminSidebar />

      <main className="admin-main-content">
        <Outlet />
      </main>
    </div>
  );
}

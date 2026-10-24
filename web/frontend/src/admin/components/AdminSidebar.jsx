import { NavLink, useNavigate } from "react-router-dom";
import useAdminAuthStore from "../../store/adminAuthStore";
import useAdminUIStore from "../../store/adminUIStore";
import { NAV_ITEMS, homePathFor } from "../access";
import "./AdminSidebar.css";

export default function AdminSidebar() {
  const { user, logout } = useAdminAuthStore();
  const { sidebarOpen, closeSidebar } = useAdminUIStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    closeSidebar();
    logout();
    navigate("/admin/login");
  };

  // Ẩn các mục không thuộc quyền của tài khoản đang đăng nhập
  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  return (
    <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
      {/* Nút đóng sidebar cho Mobile & Tablet */}
      <button className="admin-sidebar-close" onClick={closeSidebar} aria-label="Đóng menu">
        <ion-icon name="close-outline"></ion-icon>
      </button>

      {/* Brand Header with Original Web Logo */}
      <div className="admin-sidebar-brand">
        <NavLink to={homePathFor(user?.role)} className="brand-logo-wrap" title="The Sweets Admin">
          <img src="/assets/Img/Sweets1.png" alt="The Sweets" className="admin-brand-logo-img" />
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="admin-nav-menu">
        <div className="sidebar-section-title">MENU CHÍNH</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={closeSidebar}
            className={({ isActive }) =>
              isActive ? "admin-nav-item active" : "admin-nav-item"
            }
          >
            <ion-icon name={item.icon}></ion-icon>
            <span>{item.label}</span>
            {item.badge && <span className="nav-badge-pill">{item.badge}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer System Section */}
      <div className="admin-sidebar-footer">
        <div className="sidebar-section-title" style={{ padding: "8px 12px 4px" }}>HỆ THỐNG</div>
        <button onClick={handleLogout} className="admin-logout-btn">
          <ion-icon name="log-out-outline"></ion-icon>
          <span>Đăng Xuất</span>
        </button>
      </div>
    </aside>
  );
}

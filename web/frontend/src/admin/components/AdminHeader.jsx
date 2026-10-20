import useAdminAuthStore from "../../store/adminAuthStore";
import useAdminUIStore from "../../store/adminUIStore";
import "./AdminHeader.css";

export default function AdminHeader() {
  const { user } = useAdminAuthStore();
  const { toggleSidebar } = useAdminUIStore();

  const displayName = user?.email || user?.phone || "Admin";
  const initials = (user?.email ? user.email.split("@")[0] : displayName).slice(0, 2).toUpperCase();

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        {/* Nút Hamburger bật/tắt Sidebar trên Tablet & Mobile */}
        <button 
          className="admin-menu-toggle" 
          onClick={toggleSidebar} 
          aria-label="Mở thanh điều hướng"
          type="button"
        >
          <ion-icon name="menu-outline"></ion-icon>
        </button>
      </div>

      <div className="admin-header-right">
        <div className="admin-profile-pill">
          <div className="admin-profile-meta">
            <span className="admin-profile-name">{displayName}</span>
            <span className="admin-profile-role">Quản lý vận hành</span>
          </div>
          <div className="admin-avatar-initials">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}

import useAuthStore from "../../store/authStore";
import useAdminUIStore from "../../store/adminUIStore";
import "./AdminHeader.css";

export default function AdminHeader() {
  const { user } = useAuthStore();
  const { toggleSidebar } = useAdminUIStore();

  const displayName = user?.user_name || "Lê Thu Thảo";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase() || "LT";

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

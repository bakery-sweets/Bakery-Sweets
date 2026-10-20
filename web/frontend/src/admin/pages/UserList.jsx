import { useState } from "react";
import AdminHeader from "../components/AdminHeader";

export default function UserList() {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [users, setUsers] = useState([
    { id: 1, username: "admin_sweets", email: "thuthao.admin@thesweets.com", role: "admin", status: "active", createdAt: "01/01/2024" },
    { id: 2, username: "tuan_chef", email: "tuan.pastry@thesweets.com", role: "staff", status: "active", createdAt: "10/01/2024" },
    { id: 3, username: "mai_cashier", email: "mai.counter@thesweets.com", role: "staff", status: "active", createdAt: "15/03/2024" },
    { id: 4, username: "baongoc_vip", email: "baongoc99@gmail.com", role: "customer", status: "active", createdAt: "18/09/2026" },
    { id: 5, username: "dinhkhang_vip", email: "dinhkhang@corporation.com", role: "customer", status: "active", createdAt: "19/09/2026" },
    { id: 6, username: "spammer_bot", email: "auto_spam@tempmail.com", role: "customer", status: "locked", createdAt: "10/08/2026" },
  ]);

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "staff",
  });

  const handleToggleLock = (id) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === "active" ? "locked" : "active" };
      }
      return u;
    }));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const created = {
      id: users.length + 1,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      status: "active",
      createdAt: new Date().toLocaleDateString("vi-VN"),
    };
    setUsers([created, ...users]);
    setShowModal(false);
    setNewUser({ username: "", email: "", password: "", role: "staff" });
  };

  const filtered = users.filter((u) => {
    const matchSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <>
      <AdminHeader />

      <div className="admin-page-container">
        {/* Header Row */}
        <div className="admin-page-header-row">
          <div className="admin-page-title-group">
            <h1>Tài Khoản &amp; Phân Quyền</h1>
            <p>Kiểm soát quyền truy cập hệ thống, bảo vệ an toàn dữ liệu nội bộ</p>
          </div>

          <div className="admin-page-actions">
            <button className="btn-pill-primary" type="button" onClick={() => setShowModal(true)}>
              <ion-icon name="key-outline"></ion-icon>
              <span>Cấp Tài Khoản Mới</span>
            </button>
          </div>
        </div>

        {/* Role Filters */}
        <div className="admin-filter-tabs">
          {[
            { key: "all", label: "Tất Cả", count: users.length },
            { key: "admin", label: "Quản Trị (Admin)", count: users.filter(u => u.role === "admin").length },
            { key: "staff", label: "Nhân Viên (Staff)", count: users.filter(u => u.role === "staff").length },
            { key: "customer", label: "Khách Hàng (Customer)", count: users.filter(u => u.role === "customer").length },
          ].map((r) => (
            <button
              key={r.key}
              onClick={() => setRoleFilter(r.key)}
              className={`tab-pill-btn ${roleFilter === r.key ? "active" : ""}`}
            >
              {r.label} ({r.count})
            </button>
          ))}
        </div>

        {/* Table Box */}
        <div className="admin-card-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "8px 16px", borderRadius: "9999px", border: "1px solid #f1f2f4", width: "320px" }}>
              <ion-icon name="search-outline" style={{ color: "#94a3b8", fontSize: "17px" }}></ion-icon>
              <input
                type="text"
                placeholder="Tìm username, email tài khoản..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", width: "100%", color: "#1e293b", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ fontSize: "13px", color: "#8c9ba5", fontWeight: "600" }}>
              Hiển thị <span style={{ color: "#1e293b", fontWeight: "800" }}>{filtered.length}</span> tài khoản
            </div>
          </div>

          <div className="admin-table-clean-wrapper">
            <table className="admin-table-clean">
              <thead>
                <tr>
                  <th>TÀI KHOẢN &amp; EMAIL</th>
                  <th>VAI TRÒ (ROLE)</th>
                  <th>NGÀY TẠO</th>
                  <th>TRẠNG THÁI</th>
                  <th style={{ textAlign: "right" }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: "700", color: "#1e293b" }}>{u.username}</div>
                      <div style={{ fontSize: "12px", color: "#8c9ba5" }}>{u.email}</div>
                    </td>
                    <td>
                      {u.role === "admin" && (
                        <span className="badge-pill pink" style={{ fontWeight: "800" }}>
                          <ion-icon name="shield-checkmark"></ion-icon> Quản Trị Viên
                        </span>
                      )}
                      {u.role === "staff" && (
                        <span className="badge-pill cyan" style={{ fontWeight: "700" }}>
                          <ion-icon name="id-card-outline"></ion-icon> Nhân Viên
                        </span>
                      )}
                      {u.role === "customer" && (
                        <span className="badge-pill gray">
                          Khách Hàng
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: "12.5px", color: "#64748b" }}>{u.createdAt}</span>
                    </td>
                    <td>
                      {u.status === "active" ? (
                        <span className="badge-pill mint" style={{ fontSize: "11.5px" }}>
                          <span className="dot-status green"></span> Hoạt động
                        </span>
                      ) : (
                        <span className="badge-pill amber" style={{ background: "#fee2e2", color: "#b91c1c", fontSize: "11.5px" }}>
                          <span className="dot-status" style={{ background: "#ef4444" }}></span> Đã khóa
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {u.role !== "admin" ? (
                        <button
                          type="button"
                          onClick={() => handleToggleLock(u.id)}
                          className="btn-pill-outline"
                          style={{
                            padding: "5px 12px",
                            fontSize: "12px",
                            color: u.status === "active" ? "#ef4444" : "#10b981",
                            borderColor: u.status === "active" ? "#fca5a5" : "#6ee7b7",
                          }}
                        >
                          {u.status === "active" ? "Khóa Nick" : "Mở Khóa"}
                        </button>
                      ) : (
                        <span style={{ fontSize: "11.5px", color: "#8c9ba5", fontStyle: "italic" }}>Cố định</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Cấp Tài Khoản Mới */}
        {showModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.45)",
              backdropFilter: "blur(4px)",
              zIndex: 1100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "24px",
                width: "100%",
                maxWidth: "460px",
                padding: "28px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                border: "1px solid #f0f1f4",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#1e293b" }}>
                    Cấp Tài Khoản Mới
                  </h3>
                  <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#8c9ba5" }}>Tạo tài khoản đăng nhập cho nhân viên</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ background: "#f8fafc", border: "none", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", fontSize: "18px" }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>Username</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: chef_tuan"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13.5px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>Email</label>
                  <input
                    type="email"
                    required
                    placeholder="VD: chef_tuan@thesweets.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13.5px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>Mật khẩu khởi tạo</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13.5px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>Vai trò (Role)</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13.5px", outline: "none", boxSizing: "border-box" }}
                  >
                    <option value="staff">Nhân Viên (Staff - Bếp/Quầy)</option>
                    <option value="admin">Quản Trị Viên (Admin)</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button type="button" className="btn-pill-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowModal(false)}>
                    Hủy Bỏ
                  </button>
                  <button type="submit" className="btn-pill-primary" style={{ flex: 1, justifyContent: "center" }}>
                    Xác Nhận Cấp
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

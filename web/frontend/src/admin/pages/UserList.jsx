import { useCallback, useEffect, useState } from "react";
import AdminHeader from "../components/AdminHeader";
import { adminUsersApi } from "../../api/admin";
import { formatDate, apiErrorMessage } from "../../utils/format";

const fullName = (u) => [u.first_name, u.last_name].filter(Boolean).join(" ");

export default function UserList() {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "staff",
  });

  const loadUsers = useCallback(async () => {
    try {
      const res = await adminUsersApi.getAll();
      setUsers(res.data);
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "Không tải được danh sách tài khoản"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleLock = async (phone) => {
    try {
      await adminUsersApi.toggleStatus(phone);
      await loadUsers();
    } catch (err) {
      alert(apiErrorMessage(err, "Không đổi được trạng thái tài khoản"));
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    alert("Backend chưa hỗ trợ cấp tài khoản mới.");
    setShowModal(false);
    setNewUser({ username: "", email: "", password: "", role: "staff" });
  };

  const filtered = users.filter((u) => {
    const keyword = searchTerm.toLowerCase();
    const matchSearch =
      u.phone.includes(keyword) ||
      u.email.toLowerCase().includes(keyword) ||
      fullName(u).toLowerCase().includes(keyword);
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
                placeholder="Tìm số điện thoại, email, họ tên..."
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
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "#8c9ba5" }}>
                      {loading ? "Đang tải..." : error || "Không có tài khoản nào."}
                    </td>
                  </tr>
                )}
                {filtered.map((u) => (
                  <tr key={u.phone}>
                    <td>
                      <div style={{ fontWeight: "700", color: "#1e293b" }}>{fullName(u) || u.phone}</div>
                      <div style={{ fontSize: "12px", color: "#8c9ba5" }}>{u.phone} • {u.email}</div>
                    </td>
                    <td>
                      {u.role === "admin" && (
                        <span className="badge-pill pink" style={{ fontWeight: "800" }}>
                          <ion-icon name="shield-checkmark"></ion-icon> Quản Trị Viên
                        </span>
                      )}
                      {u.role === "customer" && (
                        <span className="badge-pill gray">
                          Khách Hàng
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: "12.5px", color: "#64748b" }}>{formatDate(u.created_at)}</span>
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
                          onClick={() => handleToggleLock(u.phone)}
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
                    <option value="staff">Nhân Viên (Staff - Kho/Quầy bán hàng)</option>
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

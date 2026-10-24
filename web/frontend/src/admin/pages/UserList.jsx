import { useCallback, useEffect, useState } from "react";
import AdminHeader from "../components/AdminHeader";
import { adminUsersApi } from "../../api/admin";
import useAdminAuthStore from "../../store/adminAuthStore";
import { formatDate, apiErrorMessage } from "../../utils/format";
import popup from "../../utils/popup";

const fullName = (u) => [u.first_name, u.last_name].filter(Boolean).join(" ");

const EMAIL_DOMAIN = "@thesweets.com";
const PHONE_REGEX = /^0\d{9}$/;
const EMAIL_PREFIX_REGEX = /^[a-z0-9]+([._-][a-z0-9]+)*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_OPTIONS = [
  { value: "staff", label: "Nhân Viên (Staff - chỉ Quản lý đơn hàng)" },
  { value: "admin", label: "Quản Trị Viên (Admin - toàn quyền)" },
  { value: "customer", label: "Khách Hàng (Customer)" },
];

const COMMON_LOCK_REASONS = [
  "Vi phạm quy định / chính sách của cửa hàng",
  "Nhân viên đã nghỉ việc / Chuyển công tác",
  "Tài khoản có dấu hiệu bất thường hoặc gian lận",
  "Khách hàng spam đặt đơn hàng ảo nhiều lần",
  "Tạm khóa theo yêu cầu của chủ tài khoản",
  "Khác (Tự nhập lý do bên dưới)",
];

// DB lưu họ ở first_name (VD: "Nguyễn" + "Văn An"), fullName() ghép first_name trước
const EMPTY_NEW_USER = {
  first_name: "",
  last_name: "",
  phone: "",
  emailPrefix: "",
  password: "",
  role: "staff",
};

// Dán "mail@sweets.com" hay "mail@gmail.com" đều chỉ giữ lại "mail"
const toEmailPrefix = (value) => value.split("@")[0].replace(/\s+/g, "").toLowerCase();

const validateNewUser = (u) => {
  if (!u.first_name.trim() || !u.last_name.trim()) return "Vui lòng nhập đầy đủ Họ & Tên đệm và Tên.";
  if (!u.phone) return "Vui lòng nhập số điện thoại.";
  if (!PHONE_REGEX.test(u.phone)) return "Số điện thoại không hợp lệ (gồm đúng 10 chữ số, bắt đầu bằng 0).";
  if (!u.emailPrefix) return "Vui lòng nhập tên email.";
  if (!EMAIL_PREFIX_REGEX.test(u.emailPrefix)) return "Tên email chỉ gồm chữ thường không dấu, số và các ký tự . _ -";
  if (u.password.length < 6) return "Mật khẩu khởi tạo phải có tối thiểu 6 ký tự.";
  return "";
};

const validateEditUser = (u) => {
  if (!u.first_name.trim() || !u.last_name.trim()) return "Vui lòng nhập đầy đủ Họ & Tên đệm và Tên.";
  if (!u.email.trim()) return "Vui lòng nhập email.";
  if (!EMAIL_REGEX.test(u.email.trim())) return "Email không hợp lệ.";
  return "";
};

const labelStyle = { display: "block", fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "6px" };
const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13.5px", outline: "none", boxSizing: "border-box" };
const lockedInputStyle = { ...inputStyle, background: "#f1f5f9", color: "#64748b", cursor: "not-allowed" };
const hintStyle = { margin: "5px 0 0", fontSize: "11.5px", color: "#8c9ba5" };
const formStyle = { display: "flex", flexDirection: "column", gap: "14px" };
const actionBtnStyle = { padding: "5px 12px", fontSize: "12px" };

function ModalShell({ title, subtitle, onClose, closeDisabled, children }) {
  return (
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
          maxWidth: "480px",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          padding: "28px",
          boxSizing: "border-box",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          border: "1px solid #f0f1f4",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#1e293b" }}>{title}</h3>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#8c9ba5" }}>{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            style={{ background: "#f8fafc", border: "none", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", fontSize: "18px" }}
          >
            <ion-icon name="close-outline"></ion-icon>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

export default function UserList() {
  const currentAdmin = useAdminAuthStore((state) => state.user);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newUser, setNewUser] = useState(EMPTY_NEW_USER);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [showLockModal, setShowLockModal] = useState(false);
  const [lockTarget, setLockTarget] = useState(null);
  const [lockReason, setLockReason] = useState("");
  const [lockReasonSelect, setLockReasonSelect] = useState("");
  const [isLocking, setIsLocking] = useState(false);

  const setField = (field, value) => setNewUser((prev) => ({ ...prev, [field]: value }));
  const setEditField = (field, value) => setEditUser((prev) => ({ ...prev, [field]: value }));
  const isSelf = (u) => u?.phone === currentAdmin?.phone;
  const isEditingSelf = isSelf(editUser);

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

  const openLockModal = (u) => {
    setLockTarget(u);
    setLockReasonSelect(COMMON_LOCK_REASONS[0]);
    setLockReason(COMMON_LOCK_REASONS[0]);
    setShowLockModal(true);
  };

  const handleLockReasonChange = (val) => {
    setLockReasonSelect(val);
    if (val !== "Khác (Tự nhập lý do bên dưới)") {
      setLockReason(val);
    } else {
      setLockReason("");
    }
  };

  const handleConfirmLock = async (e) => {
    e.preventDefault();
    if (isLocking || !lockTarget) return;

    const trimmedReason = lockReason.trim();
    if (!trimmedReason) {
      popup.warning("Vui lòng nhập lý do khóa tài khoản.", { title: "Thiếu lý do khóa" });
      return;
    }

    setIsLocking(true);
    try {
      await adminUsersApi.toggleStatus(lockTarget.phone, { reason: trimmedReason });
      const name = fullName(lockTarget) || lockTarget.phone;
      popup.success(`Đã tạm khóa tài khoản "${name}" thành công!`);
      setShowLockModal(false);
      setLockTarget(null);
      await loadUsers();
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không khóa được tài khoản"));
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlock = async (u) => {
    const name = fullName(u) || u.phone;
    const confirmed = await popup.confirm({
      title: "Mở khóa tài khoản?",
      message: `Mở khóa cho tài khoản "${name}"?`,
      subtitle: "Người dùng có thể đăng nhập và tiếp tục mua sắm bình thường.",
      confirmText: "Mở khóa",
      cancelText: "Hủy bỏ",
      type: "success",
      icon: "unlock",
    });

    if (!confirmed) return;

    try {
      await adminUsersApi.toggleStatus(u.phone);
      popup.success(`Đã mở khóa tài khoản "${name}" thành công!`);
      await loadUsers();
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không đổi được trạng thái tài khoản"));
    }
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setShowModal(false);
    setNewUser(EMPTY_NEW_USER);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validationError = validateNewUser(newUser);
    if (validationError) {
      popup.warning(validationError, { title: "Thông tin chưa hợp lệ" });
      return;
    }

    const payload = {
      first_name: newUser.first_name.trim(),
      last_name: newUser.last_name.trim(),
      phone: newUser.phone,
      email: `${newUser.emailPrefix.trim()}${EMAIL_DOMAIN}`,
      password: newUser.password,
      role: newUser.role,
    };

    setIsSubmitting(true);
    try {
      await adminUsersApi.create(payload);
      popup.success("Cấp tài khoản mới thành công!");
      setShowModal(false);
      setNewUser(EMPTY_NEW_USER);
      await loadUsers();
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không thể cấp tài khoản"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (u) => {
    setEditUser({
      phone: u.phone,
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      email: u.email,
      role: u.role,
      status: u.status,
      lock_reason: u.lock_reason || "",
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (isUpdating) return;
    setShowEditModal(false);
    setEditUser(null);
  };

  const applyCompanyDomain = () => {
    const prefix = toEmailPrefix(editUser.email);
    if (!prefix) {
      popup.warning("Vui lòng nhập tên email trước khi chuyển đuôi.");
      return;
    }
    setEditField("email", `${prefix}${EMAIL_DOMAIN}`);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (isUpdating) return;

    const validationError = validateEditUser(editUser);
    if (validationError) {
      popup.warning(validationError, { title: "Thông tin chưa hợp lệ" });
      return;
    }

    const payload = {
      first_name: editUser.first_name.trim(),
      last_name: editUser.last_name.trim(),
      email: editUser.email.trim().toLowerCase(),
      role: editUser.role,
      status: editUser.status,
      lock_reason: editUser.status === "locked" ? (editUser.lock_reason || "Khóa bởi Quản trị viên").trim() : null,
    };

    setIsUpdating(true);
    try {
      const res = await adminUsersApi.update(editUser.phone, payload);
      // Header lấy email từ phiên đăng nhập, nên đồng bộ lại khi admin tự sửa hồ sơ của mình
      if (isEditingSelf) {
        const { token, setUser } = useAdminAuthStore.getState();
        setUser({ ...currentAdmin, email: res.data.email }, token);
      }
      popup.success("Cập nhật tài khoản thành công!");
      setShowEditModal(false);
      setEditUser(null);
      await loadUsers();
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không thể cập nhật tài khoản"));
    } finally {
      setIsUpdating(false);
    }
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
                  <th>LÝ DO KHÓA</th>
                  <th style={{ textAlign: "right" }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "#8c9ba5" }}>
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
                    <td>
                      {u.status === "locked" ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", maxWidth: "250px" }}>
                          <span
                            className="badge-pill amber"
                            style={{
                              background: "#fef2f2",
                              color: "#b91c1c",
                              border: "1px solid #fee2e2",
                              fontSize: "12px",
                              padding: "4px 10px",
                              lineHeight: "1.4",
                              wordBreak: "break-word",
                              whiteSpace: "normal",
                              textAlign: "left",
                            }}
                            title={u.lock_reason || "Khóa bởi Quản trị viên"}
                          >
                            <ion-icon name="alert-circle-outline" style={{ fontSize: "14px", flexShrink: 0, marginTop: "1px" }}></ion-icon>
                            <span>{u.lock_reason || "Khóa bởi Quản trị viên"}</span>
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "#cbd5e1", fontSize: "15px", paddingLeft: "8px" }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="btn-pill-outline"
                          style={actionBtnStyle}
                        >
                          <ion-icon name="create-outline"></ion-icon> Sửa
                        </button>
                        {isSelf(u) ? (
                          <span
                            title="Tài khoản của bạn"
                            style={{ fontSize: "11.5px", color: "#8c9ba5", fontStyle: "italic", whiteSpace: "nowrap" }}
                          >
                            Tài khoản của bạn
                          </span>
                        ) : (
                          u.status === "active" ? (
                            <button
                              type="button"
                              onClick={() => openLockModal(u)}
                              className="btn-pill-outline"
                              style={{
                                ...actionBtnStyle,
                                color: "#ef4444",
                                borderColor: "#fca5a5",
                              }}
                            >
                              Khóa Tài khoản
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnlock(u)}
                              className="btn-pill-outline"
                              style={{
                                ...actionBtnStyle,
                                color: "#10b981",
                                borderColor: "#6ee7b7",
                              }}
                            >
                              Mở Khóa
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Cấp Tài Khoản Mới */}
        {showModal && (
          <ModalShell
            title="Cấp Tài Khoản Mới"
            subtitle="Tạo tài khoản đăng nhập cho nhân viên hoặc quản trị viên"
            onClose={closeModal}
            closeDisabled={isSubmitting}
          >
            <form onSubmit={handleCreate} noValidate style={formStyle}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Họ &amp; Tên đệm</label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn"
                    value={newUser.first_name}
                    onChange={(e) => setField("first_name", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tên</label>
                  <input
                    type="text"
                    placeholder="VD: Tuấn"
                    value={newUser.last_name}
                    onChange={(e) => setField("last_name", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Số điện thoại</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="VD: 0912345678"
                  value={newUser.phone}
                  onChange={(e) => setField("phone", e.target.value.replace(/\D/g, ""))}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 4px 4px 0",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                  }}
                >
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="VD: chef_tuan"
                    value={newUser.emailPrefix}
                    onChange={(e) => setField("emailPrefix", toEmailPrefix(e.target.value))}
                    style={{ ...inputStyle, flex: 1, minWidth: 0, border: "none", padding: "6px 14px" }}
                  />
                  <span
                    style={{
                      flexShrink: 0,
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "#f1f5f9",
                      color: "#64748b",
                      fontSize: "13px",
                      fontWeight: "700",
                      whiteSpace: "nowrap",
                      userSelect: "none",
                    }}
                  >
                    {EMAIL_DOMAIN}
                  </span>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Mật khẩu khởi tạo</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={newUser.password}
                  onChange={(e) => setField("password", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Vai trò (Role)</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setField("role", e.target.value)}
                  style={inputStyle}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button type="button" className="btn-pill-outline" style={{ flex: 1, justifyContent: "center" }} onClick={closeModal} disabled={isSubmitting}>
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary"
                  disabled={isSubmitting}
                  style={{ flex: 1, justifyContent: "center", opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? "not-allowed" : "pointer" }}
                >
                  {isSubmitting ? "Đang tạo..." : "Xác Nhận Cấp"}
                </button>
              </div>
            </form>
          </ModalShell>
        )}

        {/* Modal Chỉnh Sửa Tài Khoản */}
        {showEditModal && editUser && (
          <ModalShell
            title="Chỉnh Sửa Tài Khoản"
            subtitle="Cập nhật thông tin, vai trò và trạng thái tài khoản"
            onClose={closeEditModal}
            closeDisabled={isUpdating}
          >
            <form onSubmit={handleUpdate} noValidate style={formStyle}>
              <div>
                <label style={labelStyle}>Số điện thoại</label>
                <input type="text" value={editUser.phone} readOnly disabled style={lockedInputStyle} />
                <p style={hintStyle}>Số điện thoại không thể thay đổi.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Họ &amp; Tên đệm</label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn"
                    value={editUser.first_name}
                    onChange={(e) => setEditField("first_name", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tên</label>
                  <input
                    type="text"
                    placeholder="VD: Tuấn"
                    value={editUser.last_name}
                    onChange={(e) => setEditField("last_name", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <input
                    type="email"
                    autoComplete="off"
                    value={editUser.email}
                    onChange={(e) => setEditField("email", e.target.value)}
                    style={{ ...inputStyle, flex: "1 1 200px", minWidth: 0 }}
                  />
                  <button
                    type="button"
                    onClick={applyCompanyDomain}
                    className="btn-pill-outline"
                    style={{ ...actionBtnStyle, whiteSpace: "nowrap", justifyContent: "center" }}
                  >
                    Chuyển đuôi {EMAIL_DOMAIN}
                  </button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Vai trò (Role)</label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditField("role", e.target.value)}
                  disabled={isEditingSelf}
                  style={isEditingSelf ? lockedInputStyle : inputStyle}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {isEditingSelf && <p style={hintStyle}>Không thể tự thay đổi vai trò của chính mình.</p>}
              </div>

              <div>
                <label style={labelStyle}>Trạng thái</label>
                <select
                  value={editUser.status}
                  onChange={(e) => setEditField("status", e.target.value)}
                  disabled={isEditingSelf}
                  style={isEditingSelf ? lockedInputStyle : inputStyle}
                >
                  <option value="active">Hoạt động</option>
                  <option value="locked">Tạm khóa</option>
                </select>
                {isEditingSelf && <p style={hintStyle}>Không thể tự khóa tài khoản của chính mình.</p>}
              </div>

              {editUser.status === "locked" && (
                <div>
                  <label style={labelStyle}>Lý do khóa tài khoản</label>
                  <input
                    type="text"
                    placeholder="VD: Vi phạm quy định sử dụng, Nghỉ việc..."
                    value={editUser.lock_reason || ""}
                    onChange={(e) => setEditField("lock_reason", e.target.value)}
                    disabled={isEditingSelf}
                    style={inputStyle}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button type="button" className="btn-pill-outline" style={{ flex: 1, justifyContent: "center" }} onClick={closeEditModal} disabled={isUpdating}>
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary"
                  disabled={isUpdating}
                  style={{ flex: 1, justifyContent: "center", opacity: isUpdating ? 0.7 : 1, cursor: isUpdating ? "not-allowed" : "pointer" }}
                >
                  {isUpdating ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </ModalShell>
        )}

        {/* Modal Xác Nhận Khóa Tài Khoản */}
        {showLockModal && lockTarget && (
          <ModalShell
            title="Khóa Tài Khoản Người Dùng"
            subtitle={`Xác nhận tạm dừng quyền truy cập của "${fullName(lockTarget) || lockTarget.phone}"`}
            onClose={() => !isLocking && setShowLockModal(false)}
            closeDisabled={isLocking}
          >
            <form onSubmit={handleConfirmLock} noValidate style={formStyle}>
              <div style={{ background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "14px", padding: "12px 16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <ion-icon name="warning-outline" style={{ fontSize: "24px", color: "#ef4444", flexShrink: 0, marginTop: "2px" }}></ion-icon>
                <div style={{ fontSize: "12.5px", color: "#991b1b", lineHeight: "1.5" }}>
                  Tài khoản <strong>{fullName(lockTarget) || lockTarget.phone}</strong> ({lockTarget.phone}) sẽ bị từ chối đăng nhập và không thể thực hiện giao dịch cho đến khi được mở khóa.
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Lý do khóa <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={lockReasonSelect}
                  onChange={(e) => handleLockReasonChange(e.target.value)}
                  style={inputStyle}
                >
                  {COMMON_LOCK_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Chi tiết lý do khóa</label>
                <textarea
                  rows={3}
                  placeholder="Ghi rõ lý do khóa để hiển thị trong danh sách..."
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
                <p style={hintStyle}>Lý do này sẽ hiển thị ở cột "LÝ DO KHÓA" trên bảng tài khoản.</p>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  className="btn-pill-outline"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setShowLockModal(false)}
                  disabled={isLocking}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary"
                  disabled={isLocking}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    background: "#ef4444",
                    borderColor: "#ef4444",
                    color: "#ffffff",
                    opacity: isLocking ? 0.7 : 1,
                    cursor: isLocking ? "not-allowed" : "pointer",
                  }}
                >
                  {isLocking ? "Đang khóa..." : "Xác Nhận Khóa"}
                </button>
              </div>
            </form>
          </ModalShell>
        )}

      </div>
    </>
  );
}

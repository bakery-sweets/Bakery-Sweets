import { useCallback, useEffect, useState } from "react";
import AdminHeader from "../components/AdminHeader";
import { adminPromotionsApi } from "../../api/admin";
import { formatVND, formatDate, apiErrorMessage, PROMO_STATUS } from "../../utils/format";
import popup from "../../utils/popup";
import "./OrderList.css";

const PAGE_SIZE = 10;

// Trạng thái hiển thị: ngoài 4 trạng thái lưu trong DB, voucher Active chưa tới ngày bắt đầu là "Sắp diễn ra",
// và voucher đã quá ngày kết thúc luôn tính là hết hạn
const DISPLAY_STATUS = {
  ...PROMO_STATUS,
  Upcoming: { label: "Sắp diễn ra", badge: "cyan" },
};

const TABS = [
  { key: "all", label: "Tất Cả" },
  { key: "Active", label: "Đang Chạy" },
  { key: "Upcoming", label: "Sắp Diễn Ra" },
  { key: "Paused", label: "Tạm Dừng" },
  { key: "Draft", label: "Bản Nháp" },
  { key: "Expired", label: "Hết Hạn" },
];

const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" };
const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13.5px", boxSizing: "border-box", background: "#fff", fontFamily: "inherit" };

const displayStatus = (p, now) => {
  if (p.status === "Expired" || new Date(p.end_date) < now) return "Expired";
  if (p.status === "Active" && new Date(p.start_date) > now) return "Upcoming";
  return p.status;
};

const shortMoney = (v) => {
  const n = Number(v);
  if (n >= 1e6) return `${+(n / 1e6).toFixed(1)}tr`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
};

const tierText = (t) =>
  `Đơn từ ${shortMoney(t.min_order_value)}: giảm ${+Number(t.discount_percentage)}%` +
  (t.max_discount_value != null ? ` (tối đa ${shortMoney(t.max_discount_value)})` : "");

const emptyTier = () => ({ min_order_value: "", discount_percentage: "", max_discount_value: "" });

const toForm = (p) =>
  p
    ? {
        promotion_id: p.promotion_id,
        promotion_code: p.promotion_code,
        promotion_name: p.promotion_name,
        description: p.description || "",
        start_date: p.start_date.slice(0, 16),
        end_date: p.end_date.slice(0, 16),
        status: p.status,
        usage_limit_per_user: p.usage_limit_per_user ?? 1,
        total_usage_limit: p.total_usage_limit ?? "",
        tiers: p.tiers.map((t) => ({
          min_order_value: Number(t.min_order_value),
          discount_percentage: Number(t.discount_percentage),
          max_discount_value: t.max_discount_value != null ? Number(t.max_discount_value) : "",
        })),
      }
    : {
        promotion_id: null,
        promotion_code: "",
        promotion_name: "",
        description: "",
        start_date: "",
        end_date: "",
        status: "Active",
        usage_limit_per_user: 1,
        total_usage_limit: "",
        tiers: [emptyTier()],
      };

export default function PromotionList() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const now = new Date();

  const loadData = useCallback(async () => {
    try {
      const res = await adminPromotionsApi.getAll();
      setPromotions(res.data);
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "Không tải được danh sách voucher"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const query = search.trim().toLowerCase();
  const searched = query
    ? promotions.filter((p) => `${p.promotion_code} ${p.promotion_name}`.toLowerCase().includes(query))
    : promotions;
  const countFor = (key) => (key === "all" ? searched.length : searched.filter((p) => displayStatus(p, now) === key).length);
  const filtered = activeTab === "all" ? searched : searched.filter((p) => displayStatus(p, now) === activeTab);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleToggle = async (p) => {
    const pausing = p.status === "Active";
    const confirmed = await popup.confirm({
      title: pausing ? "Tạm dừng voucher?" : "Kích hoạt voucher?",
      message: `Mã ${p.promotion_code} - ${p.promotion_name}`,
      subtitle: pausing
        ? "Khách hàng sẽ không áp dụng được mã này cho tới khi kích hoạt lại."
        : "Khách hàng có thể áp dụng mã trong thời gian hiệu lực của voucher.",
      confirmText: pausing ? "Tạm dừng" : "Kích hoạt",
      cancelText: "Hủy bỏ",
      type: pausing ? "warning" : "success",
      icon: pausing ? "pause" : "play",
    });
    if (!confirmed) return;

    try {
      const res = await adminPromotionsApi.updateStatus(p.promotion_id, pausing ? "Paused" : "Active");
      // Kích hoạt lại sẽ gửi thông báo cho khách, server báo kèm số khách đã nhận
      popup.success(pausing ? `Đã tạm dừng voucher ${p.promotion_code}` : res.message);
      await loadData();
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không thể cập nhật trạng thái voucher"));
    }
  };

  // ===== Form tạo / sửa =====
  const updateTier = (idx, patch) =>
    setForm((f) => ({ ...f, tiers: f.tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)) }));

  const handleSubmit = async () => {
    if (!form.promotion_code.trim() || !form.promotion_name.trim()) return popup.error("Vui lòng nhập mã và tên voucher");
    if (!form.start_date || !form.end_date) return popup.error("Vui lòng chọn thời gian hiệu lực");
    if (new Date(form.end_date) <= new Date(form.start_date)) return popup.error("Ngày kết thúc phải sau ngày bắt đầu");
    if (!(Number(form.usage_limit_per_user) >= 1)) return popup.error("Số lần dùng mỗi khách phải từ 1 trở lên");
    if (form.total_usage_limit !== "" && !(Number(form.total_usage_limit) >= 1)) return popup.error("Tổng lượt dùng phải từ 1 trở lên hoặc để trống");
    if (form.tiers.length === 0) return popup.error("Voucher cần ít nhất một mức giảm");
    for (const t of form.tiers) {
      if (t.min_order_value === "" || Number(t.min_order_value) < 0) return popup.error("Giá trị đơn tối thiểu không hợp lệ");
      const pct = Number(t.discount_percentage);
      if (!(pct > 0 && pct <= 100)) return popup.error("Phần trăm giảm phải lớn hơn 0 và không quá 100");
      if (t.max_discount_value !== "" && Number(t.max_discount_value) < 0) return popup.error("Số tiền giảm tối đa không hợp lệ");
    }
    const mins = form.tiers.map((t) => Number(t.min_order_value));
    if (new Set(mins).size !== mins.length) return popup.error("Các mức giảm không được trùng giá trị đơn tối thiểu");

    const payload = {
      promotion_code: form.promotion_code.trim().toUpperCase(),
      promotion_name: form.promotion_name.trim(),
      description: form.description,
      start_date: form.start_date,
      end_date: form.end_date,
      status: form.status,
      usage_limit_per_user: Number(form.usage_limit_per_user),
      total_usage_limit: form.total_usage_limit === "" ? null : Number(form.total_usage_limit),
      tiers: form.tiers.map((t) => ({
        min_order_value: Number(t.min_order_value),
        discount_percentage: Number(t.discount_percentage),
        max_discount_value: t.max_discount_value === "" ? null : Number(t.max_discount_value),
      })),
    };

    setSaving(true);
    try {
      const res = form.promotion_id
        ? await adminPromotionsApi.update(form.promotion_id, payload)
        : await adminPromotionsApi.create(payload);
      popup.success(res.message);
      setForm(null);
      await loadData();
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không thể lưu voucher"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminHeader />

      <div className="admin-page-container">
        {/* Header Row */}
        <div className="admin-page-header-row">
          <div className="admin-page-title-group">
            <h1>Quản Lý Voucher</h1>
            <p>Mã giảm giá theo mức tổng tiền hóa đơn &amp; giới hạn lượt sử dụng</p>
          </div>

          <div className="admin-page-actions">
            <button className="btn-pill-primary" type="button" onClick={() => setForm(toForm(null))}>
              <ion-icon name="add"></ion-icon>
              <span>Tạo Voucher</span>
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="admin-filter-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setCurrentPage(1); }}
              className={`tab-pill-btn ${activeTab === t.key ? "active" : ""}`}
            >
              {t.label} ({countFor(t.key)})
            </button>
          ))}
        </div>

        <div className="admin-card-box">
          {/* Search Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "8px 16px", borderRadius: "9999px", border: "1px solid #f1f2f4", width: "320px", maxWidth: "100%", boxSizing: "border-box" }}>
              <ion-icon name="search-outline" style={{ color: "#94a3b8", fontSize: "17px" }}></ion-icon>
              <input
                type="text"
                placeholder="Tìm mã hoặc tên voucher..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", width: "100%", color: "#1e293b", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ fontSize: "13px", color: "#8c9ba5", fontWeight: "600" }}>
              Hiển thị <span style={{ color: "#1e293b", fontWeight: "800" }}>{filtered.length}</span> voucher
            </div>
          </div>

          {error && (
            <div style={{ color: "#b91c1c", fontWeight: "600", marginBottom: "12px" }}>{error}</div>
          )}

          <div className="admin-table-clean-wrapper">
            <table className="admin-table-clean">
              <thead>
                <tr>
                  <th>MÃ VOUCHER</th>
                  <th>MỨC GIẢM</th>
                  <th>THỜI GIAN HIỆU LỰC</th>
                  <th>LƯỢT DÙNG</th>
                  <th>TRẠNG THÁI</th>
                  <th style={{ textAlign: "right" }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "#8c9ba5" }}>
                      {loading ? "Đang tải..." : "Không có voucher nào."}
                    </td>
                  </tr>
                )}
                {pageItems.map((p) => {
                  const ds = displayStatus(p, now);
                  const st = DISPLAY_STATUS[ds] || {};
                  const soldOut = p.total_usage_limit != null && p.used_count >= p.total_usage_limit;
                  return (
                    <tr key={p.promotion_id}>
                      <td>
                        <span className="badge-pill pink" style={{ fontSize: "12px", fontWeight: "800", letterSpacing: "0.5px" }}>
                          <ion-icon name="ticket-outline" style={{ marginRight: "4px", verticalAlign: "-2px" }}></ion-icon>
                          {p.promotion_code}
                        </span>
                        <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "13px", marginTop: "6px" }}>{p.promotion_name}</div>
                      </td>
                      <td>
                        {p.tiers.map((t) => (
                          <div key={t.min_order_value} style={{ fontSize: "12.5px", color: "#334155", fontWeight: "600" }}>{tierText(t)}</div>
                        ))}
                      </td>
                      <td style={{ fontSize: "12.5px" }}>
                        {formatDate(p.start_date)} - {formatDate(p.end_date)}
                      </td>
                      <td>
                        <div style={{ fontWeight: "700", color: soldOut ? "#e11d48" : "#1e293b" }}>
                          {p.used_count} / {p.total_usage_limit ?? "∞"}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#8c9ba5", marginTop: "2px" }}>
                          {soldOut ? "Đã hết lượt" : `${p.usage_limit_per_user ?? 1} lần/khách`}
                        </div>
                      </td>
                      <td>
                        <span className={`badge-pill ${st.badge || ""}`} style={{ fontSize: "11.5px" }}>{st.label || p.status}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            className="btn-pill-outline"
                            style={{ padding: "5px 12px", fontSize: "12px" }}
                            onClick={() => setForm(toForm(p))}
                          >
                            Sửa
                          </button>
                          {ds !== "Expired" && (
                            <button
                              type="button"
                              className="btn-pill-outline"
                              style={{ padding: "5px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                              onClick={() => handleToggle(p)}
                            >
                              <ion-icon name={p.status === "Active" ? "pause-circle-outline" : "play-circle-outline"}></ion-icon>
                              <span>{p.status === "Active" ? "Tạm dừng" : "Kích hoạt"}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f8f9fa", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ fontSize: "12.5px", color: "#8c9ba5" }}>
              Hiển thị {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} - {(page - 1) * PAGE_SIZE + pageItems.length} trên {filtered.length} voucher
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className="tab-pill-btn"
                disabled={page === 1}
                onClick={() => setCurrentPage(Math.max(page - 1, 1))}
                style={{ opacity: page === 1 ? 0.5 : 1 }}
              >
                &larr; Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  className={`tab-pill-btn ${page === num ? "active" : ""}`}
                  onClick={() => setCurrentPage(num)}
                >
                  {num}
                </button>
              ))}
              <button
                className="tab-pill-btn"
                disabled={page === totalPages}
                onClick={() => setCurrentPage(Math.min(page + 1, totalPages))}
                style={{ opacity: page === totalPages ? 0.5 : 1 }}
              >
                Sau &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Modal Tạo / Sửa Voucher */}
        {form && (
          <div className="order-modal-overlay">
            <div className="order-modal" role="dialog" aria-modal="true" aria-labelledby="promo-form-title" style={{ maxWidth: "720px" }}>
              <div className="order-modal-header">
                <div>
                  <span className="order-modal-eyebrow">{form.promotion_id ? "CẬP NHẬT VOUCHER" : "TẠO VOUCHER MỚI"}</span>
                  <h3 id="promo-form-title" className="order-modal-title">{form.promotion_code.trim().toUpperCase() || "Voucher mới"}</h3>
                </div>
                <button type="button" className="order-modal-close" aria-label="Đóng" onClick={() => setForm(null)}>
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Mã voucher *</label>
                  <input
                    type="text"
                    maxLength="50"
                    placeholder="VD: SWEET10"
                    value={form.promotion_code}
                    onChange={(e) => setForm({ ...form, promotion_code: e.target.value.toUpperCase() })}
                    style={{ ...inputStyle, textTransform: "uppercase", fontWeight: "700" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tên chương trình *</label>
                  <input
                    type="text"
                    maxLength="255"
                    placeholder="VD: Voucher Chào Bạn Mới"
                    value={form.promotion_name}
                    onChange={(e) => setForm({ ...form, promotion_name: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Bắt đầu *</label>
                  <input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Kết thúc *</label>
                  <input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Số lần dùng / khách *</label>
                  <input type="number" min="1" value={form.usage_limit_per_user} onChange={(e) => setForm({ ...form, usage_limit_per_user: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Tổng lượt dùng</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Để trống = không giới hạn"
                    value={form.total_usage_limit}
                    onChange={(e) => setForm({ ...form, total_usage_limit: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Trạng thái</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                    {Object.entries(PROMO_STATUS).map(([key, s]) => (
                      <option key={key} value={key}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "14px" }}>
                <label style={labelStyle}>Mô tả</label>
                <textarea
                  rows="2"
                  placeholder="VD: Giảm 10% tối đa 20.000đ cho đơn từ 80.000đ"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={inputStyle}
                ></textarea>
              </div>

              <div className="order-section" style={{ marginTop: "16px" }}>
                <span className="order-section-label">Mức Giảm Theo Tổng Tiền Hóa Đơn</span>
                <p style={{ margin: "4px 0 10px", fontSize: "12px", color: "#8c9ba5" }}>
                  Khách được áp mức cao nhất mà tổng tiền đơn đạt tới. Để trống "Giảm tối đa" nếu không giới hạn số tiền giảm.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
                  {form.tiers.map((t, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.3fr 0.8fr 1.2fr 36px", gap: "8px", alignItems: "end", minWidth: "460px" }}>
                      <div>
                        {idx === 0 && <label style={labelStyle}>Đơn tối thiểu (đ)</label>}
                        <input type="number" min="0" step="1000" value={t.min_order_value} onChange={(e) => updateTier(idx, { min_order_value: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        {idx === 0 && <label style={labelStyle}>Giảm (%)</label>}
                        <input type="number" min="1" max="100" step="0.5" value={t.discount_percentage} onChange={(e) => updateTier(idx, { discount_percentage: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        {idx === 0 && <label style={labelStyle}>Giảm tối đa (đ)</label>}
                        <input type="number" min="0" step="1000" placeholder="Không giới hạn" value={t.max_discount_value} onChange={(e) => updateTier(idx, { max_discount_value: e.target.value })} style={inputStyle} />
                      </div>
                      <button
                        type="button"
                        aria-label="Xóa mức giảm"
                        disabled={form.tiers.length === 1}
                        onClick={() => setForm({ ...form, tiers: form.tiers.filter((_, i) => i !== idx) })}
                        style={{ height: "40px", border: "1px solid #fecdd3", background: "#fff1f2", color: "#e11d48", borderRadius: "8px", cursor: form.tiers.length === 1 ? "not-allowed" : "pointer", opacity: form.tiers.length === 1 ? 0.4 : 1 }}
                      >
                        <ion-icon name="trash-outline"></ion-icon>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn-pill-outline"
                  style={{ marginTop: "12px", padding: "6px 14px", fontSize: "12.5px" }}
                  onClick={() => setForm({ ...form, tiers: [...form.tiers, emptyTier()] })}
                >
                  <ion-icon name="add"></ion-icon>
                  <span>Thêm mức giảm</span>
                </button>
              </div>

              <div className="order-modal-footer">
                <div className="order-modal-footer-actions">
                  <button type="button" className="order-btn-secondary" onClick={() => setForm(null)}>
                    <span>Hủy bỏ</span>
                  </button>
                  <button type="button" className="btn-pill-primary order-btn-primary" disabled={saving} onClick={handleSubmit}>
                    <ion-icon name="checkmark-circle-outline"></ion-icon>
                    <span>{form.promotion_id ? "Lưu Thay Đổi" : "Tạo Voucher"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

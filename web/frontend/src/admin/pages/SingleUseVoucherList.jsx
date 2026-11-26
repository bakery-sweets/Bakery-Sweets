import { useCallback, useEffect, useState } from "react";
import AdminHeader from "../components/AdminHeader";
import VoucherTabs from "../components/VoucherTabs";
import { adminSingleUseVouchersApi } from "../../api/admin";
import { formatDateTime, apiErrorMessage } from "../../utils/format";
import { saveBlob } from "../../utils/download";
import popup from "../../utils/popup";
import "./OrderList.css";
import "./AdminModal.css";

const PAGE_SIZE = 10;

// Mã chưa dùng nhưng đã quá hạn hiển thị là "Hết hạn" (server trả is_expired)
const STATUS = {
  Unused: { label: "Chưa dùng", badge: "mint" },
  Used: { label: "Đã dùng", badge: "cyan" },
  Disabled: { label: "Vô hiệu hóa", badge: "gray" },
  Expired: { label: "Hết hạn", badge: "amber" },
};
const displayStatus = (v) => (v.is_expired ? "Expired" : v.status);

const TABS = [
  { key: "all", label: "Tất Cả" },
  { key: "Unused", label: "Chưa Dùng" },
  { key: "Used", label: "Đã Dùng" },
  { key: "Disabled", label: "Vô Hiệu Hóa" },
  { key: "Expired", label: "Hết Hạn" },
];

const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" };
const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13.5px", boxSizing: "border-box", background: "#fff", fontFamily: "inherit" };
const codeStyle = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: "13px", fontWeight: "800", letterSpacing: "1px" };

// Hạn mặc định: cuối ngày, 30 ngày sau
const defaultExpiry = () => {
  const d = new Date(Date.now() + 30 * 86400000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`;
};

const emptyForm = () => ({
  quantity: 10,
  discount_type: "percent",
  discount_value: 10,
  max_discount_value: "",
  min_order_value: 0,
  expires_at: defaultExpiry(),
  batch_name: "",
});

const copyText = async (text, msg) => {
  try {
    await navigator.clipboard.writeText(text);
    popup.success(msg);
  } catch {
    popup.error("Trình duyệt không cho phép sao chép, vui lòng chọn và sao chép thủ công");
  }
};

const exportCsv = (vouchers, filename) => {
  const rows = [["Mã", "Mức giảm", "Hạn dùng", "Đợt phát hành"]].concat(
    vouchers.map((v) => [v.code, v.description, v.expires_at ? formatDateTime(v.expires_at) : "Không hết hạn", v.batch_name || ""])
  );
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  // BOM để Excel đọc đúng tiếng Việt
  saveBlob(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), filename);
};

export default function SingleUseVoucherList() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  // Danh sách mã vừa sinh, hiện ngay để admin sao chép / tải về
  const [generated, setGenerated] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const res = await adminSingleUseVouchersApi.getAll();
      setVouchers(res.data);
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "Không tải được danh sách mã"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const query = search.trim().toLowerCase();
  const searched = query
    ? vouchers.filter((v) => `${v.code} ${v.batch_name || ""} ${v.used_order_code || ""}`.toLowerCase().includes(query))
    : vouchers;
  const countFor = (key) => (key === "all" ? searched.length : searched.filter((v) => displayStatus(v) === key).length);
  const filtered = activeTab === "all" ? searched : searched.filter((v) => displayStatus(v) === activeTab);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleToggle = async (v) => {
    const disabling = v.status === "Unused";
    const confirmed = await popup.confirm({
      title: disabling ? "Vô hiệu hóa mã?" : "Kích hoạt lại mã?",
      message: `Mã ${v.code}${v.batch_name ? ` - ${v.batch_name}` : ""}`,
      subtitle: disabling
        ? "Khách sẽ không dùng được mã này cho tới khi bạn kích hoạt lại."
        : "Khách có thể dùng lại mã này (1 lần) trong thời hạn của mã.",
      confirmText: disabling ? "Vô hiệu hóa" : "Kích hoạt",
      cancelText: "Hủy bỏ",
      type: disabling ? "warning" : "success",
      icon: disabling ? "pause" : "play",
    });
    if (!confirmed) return;
    try {
      const res = await adminSingleUseVouchersApi.updateStatus(v.voucher_id, disabling ? "Disabled" : "Unused");
      popup.success(res.message);
      await loadData();
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không thể cập nhật trạng thái mã"));
    }
  };

  const handleGenerate = async () => {
    const qty = Number(form.quantity);
    const value = Number(form.discount_value);
    if (!Number.isInteger(qty) || qty < 1 || qty > 500) return popup.error("Số lượng mã phải từ 1 đến 500");
    if (!(value > 0)) return popup.error("Mức giảm phải lớn hơn 0");
    if (form.discount_type === "percent" && value > 100) return popup.error("Phần trăm giảm không được vượt quá 100%");
    if (form.max_discount_value !== "" && !(Number(form.max_discount_value) > 0)) return popup.error("Giảm tối đa phải lớn hơn 0 hoặc để trống");
    if (form.min_order_value === "" || Number(form.min_order_value) < 0) return popup.error("Đơn tối thiểu không hợp lệ");
    if (form.expires_at && new Date(form.expires_at) <= new Date()) return popup.error("Hạn dùng phải sau thời điểm hiện tại");

    setSaving(true);
    try {
      const res = await adminSingleUseVouchersApi.generate({
        quantity: qty,
        discount_type: form.discount_type,
        discount_value: value,
        max_discount_value: form.discount_type === "percent" && form.max_discount_value !== "" ? Number(form.max_discount_value) : null,
        min_order_value: Number(form.min_order_value),
        expires_at: form.expires_at || null,
        batch_name: form.batch_name.trim() || null,
      });
      popup.success(res.message);
      setForm(null);
      setGenerated(res.data.vouchers);
      await loadData();
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không thể sinh mã"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminHeader />

      <div className="admin-page-container">
        <div className="admin-page-header-row">
          <div className="admin-page-title-group">
            <h1>Voucher &amp; Khuyến Mãi</h1>
            <p>Mã dùng 1 lần: dùng xong tự khóa, đơn bị hủy thì mã được trả lại</p>
          </div>
          <div className="admin-page-actions">
            <button className="btn-pill-primary" type="button" onClick={() => setForm(emptyForm())}>
              <ion-icon name="sparkles-outline"></ion-icon>
              <span>Sinh Mã Mới</span>
            </button>
          </div>
        </div>

        <VoucherTabs />

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "8px 16px", borderRadius: "9999px", border: "1px solid #f1f2f4", width: "320px", maxWidth: "100%", boxSizing: "border-box" }}>
              <ion-icon name="search-outline" style={{ color: "#94a3b8", fontSize: "17px" }}></ion-icon>
              <input
                type="text"
                placeholder="Tìm mã, đợt phát hành, mã đơn..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", width: "100%", color: "#1e293b", fontFamily: "inherit" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {filtered.some((v) => displayStatus(v) === "Unused") && (
                <button
                  type="button"
                  className="btn-pill-outline"
                  style={{ padding: "6px 14px", fontSize: "12.5px" }}
                  onClick={() => exportCsv(filtered.filter((v) => displayStatus(v) === "Unused"), "ma-giam-gia-chua-dung.csv")}
                >
                  <ion-icon name="download-outline"></ion-icon>
                  <span>Tải mã chưa dùng (CSV)</span>
                </button>
              )}
              <div style={{ fontSize: "13px", color: "#8c9ba5", fontWeight: "600" }}>
                Hiển thị <span style={{ color: "#1e293b", fontWeight: "800" }}>{filtered.length}</span> mã
              </div>
            </div>
          </div>

          {error && <div style={{ color: "#b91c1c", fontWeight: "600", marginBottom: "12px" }}>{error}</div>}

          <div className="admin-table-clean-wrapper">
            <table className="admin-table-clean">
              <thead>
                <tr>
                  <th>MÃ</th>
                  <th>MỨC GIẢM</th>
                  <th>HẠN DÙNG</th>
                  <th>TRẠNG THÁI</th>
                  <th>SỬ DỤNG</th>
                  <th style={{ textAlign: "right" }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "#8c9ba5" }}>
                      {loading ? "Đang tải..." : "Không có mã nào."}
                    </td>
                  </tr>
                )}
                {pageItems.map((v) => {
                  const ds = displayStatus(v);
                  const st = STATUS[ds] || {};
                  return (
                    <tr key={v.voucher_id}>
                      <td>
                        <button
                          type="button"
                          title="Sao chép mã"
                          className="badge-pill pink"
                          onClick={() => copyText(v.code, `Đã sao chép mã ${v.code}`)}
                          style={{ ...codeStyle, border: "none", cursor: "pointer" }}
                        >
                          {v.code}
                          <ion-icon name="copy-outline"></ion-icon>
                        </button>
                        {v.batch_name && (
                          <div style={{ fontWeight: "600", color: "#64748b", fontSize: "12px", marginTop: "6px" }}>{v.batch_name}</div>
                        )}
                      </td>
                      <td style={{ fontSize: "12.5px", color: "#334155", fontWeight: "600", maxWidth: "240px" }}>{v.description}</td>
                      <td style={{ fontSize: "12.5px" }}>{v.expires_at ? formatDateTime(v.expires_at) : "Không hết hạn"}</td>
                      <td>
                        <span className={`badge-pill ${st.badge || ""}`} style={{ fontSize: "11.5px" }}>{st.label || v.status}</span>
                      </td>
                      <td style={{ fontSize: "12.5px" }}>
                        {v.status === "Used" ? (
                          <>
                            <div style={{ fontWeight: "700", color: "#1e293b" }}>Đơn {v.used_order_code || `#${v.used_order_id}`}</div>
                            <div style={{ color: "#64748b", marginTop: "2px" }}>
                              {v.used_by_name || "Khách vãng lai"}{v.used_by_phone ? ` · ${v.used_by_phone}` : ""}
                            </div>
                            <div style={{ color: "#94a3b8", marginTop: "2px" }}>{formatDateTime(v.used_at)}</div>
                          </>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {v.status !== "Used" && (
                          <button
                            type="button"
                            className="btn-pill-outline"
                            style={{ padding: "5px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            onClick={() => handleToggle(v)}
                          >
                            <ion-icon name={v.status === "Unused" ? "ban-outline" : "play-circle-outline"}></ion-icon>
                            <span>{v.status === "Unused" ? "Vô hiệu hóa" : "Kích hoạt lại"}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f8f9fa", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ fontSize: "12.5px", color: "#8c9ba5" }}>
              Hiển thị {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} - {(page - 1) * PAGE_SIZE + pageItems.length} trên {filtered.length} mã
            </span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button className="tab-pill-btn" disabled={page === 1} onClick={() => setCurrentPage(Math.max(page - 1, 1))} style={{ opacity: page === 1 ? 0.5 : 1 }}>
                &larr; Trước
              </button>
              <span className="tab-pill-btn active">{page} / {totalPages}</span>
              <button className="tab-pill-btn" disabled={page === totalPages} onClick={() => setCurrentPage(Math.min(page + 1, totalPages))} style={{ opacity: page === totalPages ? 0.5 : 1 }}>
                Sau &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Modal sinh mã */}
        {form && (
          <div className="order-modal-overlay">
            <div className="order-modal" role="dialog" aria-modal="true" aria-labelledby="gen-title" style={{ maxWidth: "640px" }}>
              <div className="order-modal-header">
                <div>
                  <span className="order-modal-eyebrow">SINH MÃ NGẪU NHIÊN</span>
                  <h3 id="gen-title" className="order-modal-title">Đợt mã giảm giá dùng 1 lần</h3>
                </div>
                <button type="button" className="order-modal-close" aria-label="Đóng" onClick={() => setForm(null)}>
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Số lượng mã *</label>
                  <input type="number" min="1" max="500" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Kiểu giảm *</label>
                  <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value, discount_value: e.target.value === "percent" ? 10 : 20000 })} style={inputStyle}>
                    <option value="percent">Giảm theo %</option>
                    <option value="fixed">Giảm số tiền cố định</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{form.discount_type === "percent" ? "Giảm (%) *" : "Số tiền giảm (đ) *"}</label>
                  <input
                    type="number"
                    min="1"
                    max={form.discount_type === "percent" ? 100 : undefined}
                    step={form.discount_type === "percent" ? 1 : 1000}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                {form.discount_type === "percent" && (
                  <div>
                    <label style={labelStyle}>Giảm tối đa (đ)</label>
                    <input type="number" min="0" step="1000" placeholder="Không giới hạn" value={form.max_discount_value} onChange={(e) => setForm({ ...form, max_discount_value: e.target.value })} style={inputStyle} />
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Đơn tối thiểu (đ)</label>
                  <input type="number" min="0" step="1000" value={form.min_order_value} onChange={(e) => setForm({ ...form, min_order_value: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Hạn dùng</label>
                  <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginTop: "14px" }}>
                <label style={labelStyle}>Tên đợt phát hành</label>
                <input
                  type="text"
                  maxLength="255"
                  placeholder="VD: Tri ân khách quen tháng 12 (khách sẽ thấy tên này khi áp mã)"
                  value={form.batch_name}
                  onChange={(e) => setForm({ ...form, batch_name: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#8c9ba5" }}>
                Mã gồm 8 ký tự chữ in hoa &amp; số (bỏ 0/O, 1/I/L để khách không gõ nhầm). Để trống hạn dùng nếu mã không hết hạn.
              </p>

              <div className="order-modal-footer">
                <div className="order-modal-footer-actions">
                  <button type="button" className="order-btn-secondary" onClick={() => setForm(null)}>
                    <span>Hủy bỏ</span>
                  </button>
                  <button type="button" className="btn-pill-primary order-btn-primary" disabled={saving} onClick={handleGenerate}>
                    <ion-icon name="sparkles-outline"></ion-icon>
                    <span>{saving ? "Đang sinh mã..." : `Sinh ${form.quantity || 0} Mã`}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Kết quả vừa sinh */}
        {generated && (
          <div className="order-modal-overlay">
            <div className="order-modal" role="dialog" aria-modal="true" aria-labelledby="gen-result-title" style={{ maxWidth: "560px" }}>
              <div className="order-modal-header">
                <div>
                  <span className="order-modal-eyebrow">ĐÃ LƯU VÀO HỆ THỐNG</span>
                  <h3 id="gen-result-title" className="order-modal-title">{generated.length} mã mới</h3>
                </div>
                <button type="button" className="order-modal-close" aria-label="Đóng" onClick={() => setGenerated(null)}>
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#475569" }}>{generated[0]?.description}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "8px", maxHeight: "300px", overflowY: "auto", padding: "4px" }}>
                {generated.map((v) => (
                  <span key={v.voucher_id} className="badge-pill pink" style={{ ...codeStyle, justifyContent: "center" }}>{v.code}</span>
                ))}
              </div>
              <div className="order-modal-footer">
                <div className="order-modal-footer-actions">
                  <button type="button" className="order-btn-secondary" onClick={() => exportCsv(generated, `ma-giam-gia-${Date.now()}.csv`)}>
                    <ion-icon name="download-outline"></ion-icon>
                    <span>Tải CSV</span>
                  </button>
                  <button
                    type="button"
                    className="btn-pill-primary order-btn-primary"
                    onClick={() => copyText(generated.map((v) => v.code).join("\n"), `Đã sao chép ${generated.length} mã`)}
                  >
                    <ion-icon name="copy-outline"></ion-icon>
                    <span>Sao Chép Tất Cả</span>
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

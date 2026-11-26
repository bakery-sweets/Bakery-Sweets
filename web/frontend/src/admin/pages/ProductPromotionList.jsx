import { useCallback, useEffect, useMemo, useState } from "react";
import AdminHeader from "../components/AdminHeader";
import VoucherTabs from "../components/VoucherTabs";
import { adminProductPromotionsApi, adminProductsApi } from "../../api/admin";
import { formatVND, formatDateTime, apiErrorMessage, imageUrl } from "../../utils/format";
import popup from "../../utils/popup";
import "./OrderList.css";
import "./AdminModal.css";

const PAGE_SIZE = 10;

const STATE = {
  Running: { label: "Đang áp dụng", badge: "mint" },
  Upcoming: { label: "Sắp diễn ra", badge: "cyan" },
  Paused: { label: "Tạm dừng", badge: "amber" },
  Ended: { label: "Đã kết thúc", badge: "gray" },
};

const TABS = [
  { key: "all", label: "Tất Cả" },
  { key: "Running", label: "Đang Áp Dụng" },
  { key: "Upcoming", label: "Sắp Diễn Ra" },
  { key: "Paused", label: "Tạm Dừng" },
  { key: "Ended", label: "Đã Kết Thúc" },
];

const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" };
const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13.5px", boxSizing: "border-box", background: "#fff", fontFamily: "inherit" };
const chipStyle = (active) => ({
  padding: "5px 12px", fontSize: "12px", borderRadius: "9999px", cursor: "pointer", fontWeight: "700",
  border: `1px solid ${active ? "#de5d7c" : "#e2e8f0"}`, background: active ? "#fff0f4" : "#fff", color: active ? "#de5d7c" : "#475569",
});

const pad = (n) => String(n).padStart(2, "0");
// datetime-local dùng giờ địa phương
const toInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const endOfDay = (daysFromToday) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(23, 59, 0, 0);
  return d;
};

const timeLeft = (iso) => {
  const ms = new Date(iso) - new Date();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  if (h >= 48) return `còn ${Math.floor(h / 24)} ngày`;
  if (h >= 1) return `còn ${h} giờ`;
  return `còn ${Math.max(1, Math.floor(ms / 60000))} phút`;
};

const salePrice = (price, pct) => Math.round((Number(price) * (100 - Number(pct))) / 100);

const toForm = (p) =>
  p
    ? {
        id: p.id,
        product_id: String(p.product_id),
        size_id: p.size_id != null ? String(p.size_id) : "",
        discount_percentage: Number(p.discount_percentage),
        start_date: p.start_date.slice(0, 16),
        end_date: p.end_date.slice(0, 16),
        status: p.status,
        note: p.note || "",
      }
    : {
        id: null,
        product_id: "",
        size_id: "",
        discount_percentage: 10,
        start_date: toInput(new Date()),
        end_date: toInput(endOfDay(0)),
        status: "Active",
        note: "",
      };

export default function ProductPromotionList() {
  const [promos, setPromos] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await adminProductPromotionsApi.getAll();
      setPromos(res.data);
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "Không tải được danh sách khuyến mãi"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    adminProductsApi.getAll().then((res) => setProducts(res.data)).catch(() => setProducts([]));
  }, [loadData]);

  const query = search.trim().toLowerCase();
  const searched = query
    ? promos.filter((p) => `${p.product_name} ${p.note || ""}`.toLowerCase().includes(query))
    : promos;
  const countFor = (key) => (key === "all" ? searched.length : searched.filter((p) => p.state === key).length);
  const filtered = activeTab === "all" ? searched : searched.filter((p) => p.state === activeTab);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedProduct = useMemo(
    () => (form ? products.find((p) => String(p.product_id) === form.product_id) : null),
    [form, products]
  );
  const previewSizes = selectedProduct
    ? [...selectedProduct.sizes]
        .sort((a, b) => Number(a.price) - Number(b.price))
        .filter((s) => !form.size_id || String(s.size_id) === form.size_id)
    : [];

  const handleToggle = async (p) => {
    const pausing = p.status === "Active";
    try {
      await adminProductPromotionsApi.updateStatus(p.id, pausing ? "Paused" : "Active");
      popup.success(pausing ? `Đã tạm dừng khuyến mãi ${p.product_name}` : `Đã tiếp tục khuyến mãi ${p.product_name}`);
      await loadData();
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không thể cập nhật trạng thái khuyến mãi"));
    }
  };

  const handleDelete = async (p) => {
    const confirmed = await popup.confirm({
      title: "Xóa khuyến mãi sản phẩm?",
      message: `${p.product_name}${p.size_name ? ` (${p.size_name})` : ""} · giảm ${+Number(p.discount_percentage)}%`,
      subtitle: "Đơn hàng cũ vẫn giữ nguyên giá đã bán.",
      confirmText: "Xóa",
      cancelText: "Hủy bỏ",
      type: "danger",
      icon: "trash",
    });
    if (!confirmed) return;
    try {
      const res = await adminProductPromotionsApi.delete(p.id);
      popup.success(res.message);
      await loadData();
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không thể xóa khuyến mãi"));
    }
  };

  const setEnd = (end) => setForm((f) => ({ ...f, end_date: end }));

  const handleSubmit = async () => {
    if (!form.product_id) return popup.error("Vui lòng chọn sản phẩm");
    const pct = Number(form.discount_percentage);
    if (!(pct > 0 && pct <= 90)) return popup.error("Phần trăm giảm phải lớn hơn 0 và không quá 90");
    if (!form.start_date || !form.end_date) return popup.error("Vui lòng chọn thời gian áp dụng");
    if (new Date(form.end_date) <= new Date(form.start_date)) return popup.error("Thời điểm kết thúc phải sau thời điểm bắt đầu");

    const payload = {
      product_id: Number(form.product_id),
      size_id: form.size_id ? Number(form.size_id) : null,
      discount_percentage: pct,
      start_date: form.start_date,
      end_date: form.end_date,
      status: form.status,
      note: form.note.trim() || null,
    };
    setSaving(true);
    try {
      const res = form.id
        ? await adminProductPromotionsApi.update(form.id, payload)
        : await adminProductPromotionsApi.create(payload);
      popup.success(res.message);
      setForm(null);
      await loadData();
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không thể lưu khuyến mãi"));
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
            <p>Khuyến mãi sản phẩm: tự hết hiệu lực khi tới thời điểm kết thúc. Khách chỉ thấy nhãn "Khuyến mãi", mức giảm và size được giảm.</p>
          </div>
          <div className="admin-page-actions">
            <button className="btn-pill-primary" type="button" onClick={() => setForm(toForm(null))}>
              <ion-icon name="add"></ion-icon>
              <span>Thêm Khuyến Mãi</span>
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
                placeholder="Tìm theo tên bánh, ghi chú..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", width: "100%", color: "#1e293b", fontFamily: "inherit" }}
              />
            </div>
            <div style={{ fontSize: "13px", color: "#8c9ba5", fontWeight: "600" }}>
              Hiển thị <span style={{ color: "#1e293b", fontWeight: "800" }}>{filtered.length}</span> khuyến mãi
            </div>
          </div>

          {error && <div style={{ color: "#b91c1c", fontWeight: "600", marginBottom: "12px" }}>{error}</div>}

          <div className="admin-table-clean-wrapper">
            <table className="admin-table-clean">
              <thead>
                <tr>
                  <th>SẢN PHẨM</th>
                  <th>MỨC GIẢM</th>
                  <th>GIÁ SAU GIẢM</th>
                  <th>THỜI GIAN ÁP DỤNG</th>
                  <th>TRẠNG THÁI</th>
                  <th style={{ textAlign: "right" }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "#8c9ba5" }}>
                      {loading ? "Đang tải..." : "Chưa có khuyến mãi nào."}
                    </td>
                  </tr>
                )}
                {pageItems.map((p) => {
                  const st = STATE[p.state] || {};
                  const left = p.state === "Running" ? timeLeft(p.end_date) : null;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <img
                            src={imageUrl(p.image)}
                            alt=""
                            width="40"
                            height="40"
                            style={{ borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
                            onError={(e) => { e.target.onerror = null; e.target.src = "/assets/Img/Sweets1.png"; }}
                          />
                          <div>
                            <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "13px" }}>{p.product_name}</div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>{p.size_name || "Mọi size"}</div>
                            {p.note && <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "2px" }}>{p.note}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge-pill pink" style={{ fontSize: "13px", fontWeight: "800" }}>
                          <ion-icon name="pricetag-outline"></ion-icon>
                          -{+Number(p.discount_percentage)}%
                        </span>
                      </td>
                      <td style={{ fontSize: "12.5px" }}>
                        {p.prices.map((s) => (
                          <div key={s.size_id} style={{ whiteSpace: "nowrap" }}>
                            <span style={{ color: "#64748b" }}>{s.size_name}: </span>
                            <span style={{ textDecoration: "line-through", color: "#94a3b8" }}>{formatVND(s.price)}</span>{" "}
                            <span style={{ fontWeight: "700", color: "#1e293b" }}>{formatVND(s.sale_price)}</span>
                          </div>
                        ))}
                      </td>
                      <td style={{ fontSize: "12.5px" }}>
                        <div>{formatDateTime(p.start_date)}</div>
                        <div style={{ color: "#64748b" }}>
                          {"Đến: "}
                          <strong style={{ color: "#1e293b" }}>{formatDateTime(p.end_date)}</strong>
                        </div>
                        {left && <div style={{ color: "#d97706", fontWeight: "700", marginTop: "2px" }}>{left}</div>}
                      </td>
                      <td>
                        <span className={`badge-pill ${st.badge || ""}`} style={{ fontSize: "11.5px" }}>{st.label || p.state}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <button type="button" className="btn-pill-outline" style={{ padding: "5px 12px", fontSize: "12px" }} onClick={() => setForm(toForm(p))}>
                            Sửa
                          </button>
                          {p.state !== "Ended" && (
                            <button
                              type="button"
                              className="btn-pill-outline"
                              style={{ padding: "5px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                              onClick={() => handleToggle(p)}
                            >
                              <ion-icon name={p.status === "Active" ? "pause-circle-outline" : "play-circle-outline"}></ion-icon>
                              <span>{p.status === "Active" ? "Tạm dừng" : "Tiếp tục"}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label="Xóa khuyến mãi"
                            onClick={() => handleDelete(p)}
                            style={{ padding: "5px 9px", border: "1px solid #fecdd3", background: "#fff1f2", color: "#e11d48", borderRadius: "9999px", cursor: "pointer", display: "inline-flex" }}
                          >
                            <ion-icon name="trash-outline"></ion-icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f8f9fa", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ fontSize: "12.5px", color: "#8c9ba5" }}>
              Hiển thị {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} - {(page - 1) * PAGE_SIZE + pageItems.length} trên {filtered.length} khuyến mãi
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

        {form && (
          <div className="order-modal-overlay">
            <div className="order-modal" role="dialog" aria-modal="true" aria-labelledby="pp-form-title" style={{ maxWidth: "680px" }}>
              <div className="order-modal-header">
                <div>
                  <span className="order-modal-eyebrow">{form.id ? "CẬP NHẬT KHUYẾN MÃI" : "THÊM KHUYẾN MÃI SẢN PHẨM"}</span>
                  <h3 id="pp-form-title" className="order-modal-title">{selectedProduct?.product_name || "Chọn bánh"}</h3>
                </div>
                <button type="button" className="order-modal-close" aria-label="Đóng" onClick={() => setForm(null)}>
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Sản phẩm *</label>
                  <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value, size_id: "" })} style={inputStyle}>
                    <option value="">-- Chọn bánh --</option>
                    {products
                      .filter((p) => p.status === "Available" || String(p.product_id) === form.product_id)
                      .map((p) => (
                        <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Kích cỡ</label>
                  <select value={form.size_id} onChange={(e) => setForm({ ...form, size_id: e.target.value })} style={inputStyle} disabled={!selectedProduct}>
                    <option value="">Mọi size</option>
                    {(selectedProduct?.sizes || []).map((s) => (
                      <option key={s.size_id} value={s.size_id}>{s.size_name} · còn {s.stock_quantity}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Bắt đầu *</label>
                  <input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Kết thúc *</label>
                  <input type="datetime-local" value={form.end_date} onChange={(e) => setEnd(e.target.value)} style={inputStyle} />
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                    {[["Hết hôm nay", 0], ["Ngày mai", 1], ["2 ngày", 2]].map(([label, days]) => (
                      <button key={label} type="button" style={chipStyle(form.end_date === toInput(endOfDay(days)))} onClick={() => setEnd(toInput(endOfDay(days)))}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Giảm (%) *</label>
                  <input type="number" min="1" max="90" step="1" value={form.discount_percentage} onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })} style={inputStyle} />
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                    {[10, 15, 20].map((v) => (
                      <button key={v} type="button" style={chipStyle(Number(form.discount_percentage) === v)} onClick={() => setForm({ ...form, discount_percentage: v })}>
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Trạng thái</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                    <option value="Active">Áp dụng</option>
                    <option value="Paused">Tạm dừng</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "14px" }}>
                <label style={labelStyle}>Ghi chú nội bộ (khách không thấy)</label>
                <input
                  type="text"
                  maxLength="255"
                  placeholder="VD: Mẻ nướng sáng 26/11 cần bán hết trong ngày"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#8c9ba5" }}>
                Khách chỉ thấy nhãn "Khuyến mãi" và mức giảm, không thấy lý do. Khuyến mãi tự hết hiệu lực ở thời điểm kết thúc.
              </p>

              {previewSizes.length > 0 && Number(form.discount_percentage) > 0 && (
                <div className="order-section" style={{ marginTop: "14px" }}>
                  <span className="order-section-label">Giá khách sẽ thấy</span>
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "8px", fontSize: "13px" }}>
                    {previewSizes.map((s) => (
                      <div key={s.size_id}>
                        <span style={{ color: "#64748b" }}>{s.size_name}: </span>
                        <span style={{ textDecoration: "line-through", color: "#94a3b8" }}>{formatVND(s.price)}</span>{" "}
                        <strong style={{ color: "#e11d48" }}>{formatVND(salePrice(s.price, form.discount_percentage))}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="order-modal-footer">
                <div className="order-modal-footer-actions">
                  <button type="button" className="order-btn-secondary" onClick={() => setForm(null)}>
                    <span>Hủy bỏ</span>
                  </button>
                  <button type="button" className="btn-pill-primary order-btn-primary" disabled={saving} onClick={handleSubmit}>
                    <ion-icon name="checkmark-circle-outline"></ion-icon>
                    <span>{form.id ? "Lưu Thay Đổi" : "Tạo Khuyến Mãi"}</span>
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

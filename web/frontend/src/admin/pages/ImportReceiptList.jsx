import { useCallback, useEffect, useState } from "react";
import AdminHeader from "../components/AdminHeader";
import { adminImportReceiptsApi, adminProductsApi } from "../../api/admin";
import { formatVND, formatDateTime, apiErrorMessage, IMPORT_STATUS } from "../../utils/format";
import popup from "../../utils/popup";
import "./OrderList.css";

const PAGE_SIZE = 10;

const TABS = [
  { key: "all", label: "Tất Cả" },
  { key: "Pending", label: "Chờ Nhập Kho" },
  { key: "Completed", label: "Đã Nhập Kho" },
  { key: "Cancelled", label: "Đã Hủy" },
];

const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" };
const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13.5px", boxSizing: "border-box", background: "#fff", fontFamily: "inherit" };

// Bỏ dấu để tìm kiếm tiếng Việt không phân biệt dấu
const normalize = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

// Giá trị cho input datetime-local theo giờ địa phương
const nowLocalInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const emptyLine = () => ({ product_id: "", size_id: "", quantity: 1, import_price: "" });
const emptyForm = () => ({ supplier_id: "", import_date: nowLocalInput(), notes: "", lines: [emptyLine()] });

export default function ImportReceiptList() {
  const [receipts, setReceipts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [rec, sup, prod] = await Promise.all([
        adminImportReceiptsApi.getAll(),
        adminImportReceiptsApi.getSuppliers(),
        adminProductsApi.getAll(),
      ]);
      setReceipts(rec.data);
      setSuppliers(sup.data);
      setProducts(prod.data);
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "Không tải được danh sách phiếu nhập"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const query = normalize(search.trim().replace(/^#/, ""));
  const searched = query
    ? receipts.filter((r) => normalize(`${r.import_code} ${r.supplier_name} ${r.supplier_code}`).includes(query))
    : receipts;
  const countFor = (key) => (key === "all" ? searched.length : searched.filter((r) => r.status === key).length);
  const filtered = activeTab === "all" ? searched : searched.filter((r) => r.status === activeTab);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Bánh còn kinh doanh và đã có ít nhất một kích cỡ (tồn kho nằm ở từng kích cỡ)
  const importableProducts = products.filter((p) => p.status !== "Discontinued" && p.sizes.length > 0);
  const activeSuppliers = suppliers.filter((s) => s.status === "Active");

  const handleChangeStatus = async (nextStatus) => {
    const completing = nextStatus === "Completed";
    const confirmed = await popup.confirm({
      title: completing ? "Xác nhận nhập kho?" : "Hủy phiếu nhập?",
      message: `Phiếu #${selected.import_code} - ${selected.supplier_name}`,
      subtitle: completing
        ? `Tồn kho sẽ được cộng thêm ${selected.total_quantity} bánh theo từng kích cỡ. Phiếu đã nhập kho không thể hủy.`
        : "Phiếu sẽ chuyển sang trạng thái Đã hủy, tồn kho không thay đổi.",
      confirmText: completing ? "Nhập kho" : "Hủy phiếu",
      cancelText: "Quay lại",
      type: completing ? "success" : "danger",
    });
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const res = await adminImportReceiptsApi.updateStatus(selected.import_id, nextStatus);
      popup.success(res.message);
      setSelected(res.data);
      await loadData();
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không thể cập nhật phiếu nhập"));
    } finally {
      setActionLoading(false);
    }
  };

  // ===== Form tạo phiếu =====
  const updateLine = (idx, patch) =>
    setForm((f) => ({ ...f, lines: f.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)) }));

  const sizesOf = (productId) => products.find((p) => p.product_id === Number(productId))?.sizes || [];

  const lineTotal = (l) => (Number(l.quantity) || 0) * (Number(l.import_price) || 0);
  const formTotal = form ? form.lines.reduce((s, l) => s + lineTotal(l), 0) : 0;

  const handleSubmit = async (status) => {
    if (!form.supplier_id) return popup.error("Vui lòng chọn nhà cung cấp");
    const lines = form.lines.filter((l) => l.product_id || l.size_id || l.import_price);
    if (lines.length === 0) return popup.error("Phiếu nhập cần ít nhất một dòng bánh");
    if (lines.some((l) => !l.product_id || !l.size_id)) return popup.error("Vui lòng chọn đủ bánh và kích cỡ cho từng dòng");
    if (lines.some((l) => !(Number(l.quantity) > 0))) return popup.error("Số lượng nhập phải lớn hơn 0");
    if (lines.some((l) => l.import_price === "" || Number(l.import_price) < 0)) return popup.error("Vui lòng nhập đơn giá nhập hợp lệ");
    const keys = lines.map((l) => `${l.product_id}-${l.size_id}`);
    if (new Set(keys).size !== keys.length) return popup.error("Một bánh cùng kích cỡ chỉ được nhập một dòng");

    setActionLoading(true);
    try {
      const res = await adminImportReceiptsApi.create({
        supplier_id: Number(form.supplier_id),
        import_date: form.import_date || null,
        notes: form.notes,
        status,
        details: lines.map((l) => ({
          product_id: Number(l.product_id),
          size_id: Number(l.size_id),
          quantity: Number(l.quantity),
          import_price: Number(l.import_price),
        })),
      });
      popup.success(`${res.message} (#${res.data.import_code})`);
      setForm(null);
      await loadData();
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không thể tạo phiếu nhập"));
    } finally {
      setActionLoading(false);
    }
  };

  const selectedStatus = selected ? IMPORT_STATUS[selected.status] || {} : {};

  return (
    <>
      <AdminHeader />

      <div className="admin-page-container">
        {/* Header Row */}
        <div className="admin-page-header-row">
          <div className="admin-page-title-group">
            <h1>Phiếu Nhập Hàng</h1>
            <p>Nhập bánh từ nhà cung cấp &amp; cộng tồn kho theo từng kích cỡ</p>
          </div>

          <div className="admin-page-actions">
            <button className="btn-pill-primary" type="button" onClick={() => setForm(emptyForm())} disabled={loading}>
              <ion-icon name="add"></ion-icon>
              <span>Tạo Phiếu Nhập</span>
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
                placeholder="Tìm mã phiếu, nhà cung cấp..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", width: "100%", color: "#1e293b", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ fontSize: "13px", color: "#8c9ba5", fontWeight: "600" }}>
              Hiển thị <span style={{ color: "#1e293b", fontWeight: "800" }}>{filtered.length}</span> phiếu nhập
            </div>
          </div>

          {error && (
            <div style={{ color: "#b91c1c", fontWeight: "600", marginBottom: "12px" }}>{error}</div>
          )}

          <div className="admin-table-clean-wrapper">
            <table className="admin-table-clean">
              <thead>
                <tr>
                  <th>MÃ PHIẾU</th>
                  <th>NHÀ CUNG CẤP</th>
                  <th>NGÀY NHẬP</th>
                  <th>SỐ LƯỢNG</th>
                  <th>TỔNG TIỀN NHẬP</th>
                  <th>TRẠNG THÁI</th>
                  <th style={{ textAlign: "right" }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", color: "#8c9ba5" }}>
                      {loading ? "Đang tải..." : "Không có phiếu nhập nào."}
                    </td>
                  </tr>
                )}
                {pageItems.map((r) => {
                  const st = IMPORT_STATUS[r.status] || {};
                  return (
                    <tr key={r.import_id}>
                      <td>
                        <span style={{ fontWeight: "800", color: "#de5d7c" }}>#{r.import_code}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: "700", color: "#1e293b" }}>{r.supplier_name}</div>
                        <div style={{ fontSize: "11.5px", color: "#8c9ba5", marginTop: "2px" }}>{r.supplier_code}</div>
                      </td>
                      <td>{formatDateTime(r.import_date)}</td>
                      <td>
                        <div style={{ fontWeight: "700" }}>{r.total_quantity} bánh</div>
                        <div style={{ fontSize: "11.5px", color: "#8c9ba5", marginTop: "2px" }}>{r.details.length} mặt hàng</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: "800", color: "#1e293b" }}>{formatVND(r.total_amount, " đ")}</span>
                      </td>
                      <td>
                        <span className={`badge-pill ${st.badge || ""}`} style={{ fontSize: "11.5px" }}>
                          <span className={`dot-status ${st.dot || ""}`}></span> {st.label || r.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn-pill-outline"
                          style={{ padding: "5px 12px", fontSize: "12px" }}
                          onClick={() => setSelected(r)}
                        >
                          Xem phiếu
                        </button>
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
              Hiển thị {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} - {(page - 1) * PAGE_SIZE + pageItems.length} trên {filtered.length} phiếu
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

        {/* Modal Xem Phiếu Nhập */}
        {selected && (
          <div className="order-modal-overlay">
            <div className="order-modal" role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
              <div className="order-modal-header">
                <div>
                  <span className="order-modal-eyebrow">PHIẾU NHẬP HÀNG</span>
                  <h3 id="import-modal-title" className="order-modal-title">#{selected.import_code}</h3>
                </div>
                <button type="button" className="order-modal-close" aria-label="Đóng phiếu" onClick={() => setSelected(null)}>
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>

              <div className="order-meta">
                <div className="order-meta-row">
                  <span className="order-meta-label">Nhà cung cấp:</span>
                  <span className="order-meta-value">{selected.supplier_name} ({selected.supplier_code})</span>
                </div>
                <div className="order-meta-row">
                  <span className="order-meta-label">Ngày nhập:</span>
                  <span className="order-meta-value">{formatDateTime(selected.import_date)}</span>
                </div>
                <div className="order-meta-row">
                  <span className="order-meta-label">Trạng thái:</span>
                  <span className={`badge-pill order-badge-sm ${selectedStatus.badge || ""}`}>
                    {selectedStatus.label || selected.status}
                  </span>
                </div>
              </div>

              <div className="order-section">
                <span className="order-section-label">Danh Sách Bánh Nhập</span>
                <div className="order-receipt-items">
                  {selected.details.map((d) => (
                    <div key={`${d.product_id}-${d.size_id}`} className="order-receipt-item">
                      <span>
                        <strong>{d.quantity}x</strong> {d.product_name} <small className="order-item-size">({d.size_name})</small>
                        <small style={{ display: "block", color: "#8c9ba5" }}>Giá nhập {formatVND(d.import_price, " đ")}</small>
                      </span>
                      <span className="order-receipt-item-price">{formatVND(d.total_price, " đ")}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selected.notes && (
                <div className="order-note-box">
                  <strong>Ghi chú:</strong> {selected.notes}
                </div>
              )}

              <div className="order-receipt-total">
                <span>Tổng Tiền Nhập:</span>
                <span className="order-receipt-total-amount">{formatVND(selected.total_amount, " đ")}</span>
              </div>

              {selected.status === "Pending" && (
                <div className="order-modal-footer">
                  <button
                    type="button"
                    className="order-btn-cancel"
                    disabled={actionLoading}
                    onClick={() => handleChangeStatus("Cancelled")}
                  >
                    <ion-icon name="close-circle-outline"></ion-icon>
                    <span>Hủy Phiếu</span>
                  </button>
                  <div className="order-modal-footer-actions">
                    <button
                      type="button"
                      className="btn-pill-primary order-btn-primary"
                      disabled={actionLoading}
                      onClick={() => handleChangeStatus("Completed")}
                    >
                      <ion-icon name="checkmark-done-outline"></ion-icon>
                      <span>Xác Nhận Nhập Kho</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Tạo Phiếu Nhập */}
        {form && (
          <div className="order-modal-overlay">
            <div className="order-modal" role="dialog" aria-modal="true" aria-labelledby="import-form-title" style={{ maxWidth: "860px" }}>
              <div className="order-modal-header">
                <div>
                  <span className="order-modal-eyebrow">TẠO PHIẾU NHẬP HÀNG</span>
                  <h3 id="import-form-title" className="order-modal-title">Phiếu nhập mới</h3>
                </div>
                <button type="button" className="order-modal-close" aria-label="Đóng" onClick={() => setForm(null)}>
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={labelStyle}>Nhà cung cấp *</label>
                  <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} style={inputStyle}>
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {activeSuppliers.map((s) => (
                      <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_code} - {s.supplier_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Ngày nhập</label>
                  <input
                    type="datetime-local"
                    value={form.import_date}
                    onChange={(e) => setForm({ ...form, import_date: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="order-section">
                <span className="order-section-label">Danh Sách Bánh Nhập</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                  {form.lines.map((l, idx) => {
                    const sizes = sizesOf(l.product_id);
                    return (
                      <div
                        key={idx}
                        style={{ display: "grid", gridTemplateColumns: "minmax(160px, 2fr) minmax(120px, 1.2fr) 80px minmax(110px, 1fr) 110px 36px", gap: "8px", alignItems: "end", minWidth: "640px" }}
                      >
                        <div>
                          {idx === 0 && <label style={labelStyle}>Bánh</label>}
                          <select
                            value={l.product_id}
                            onChange={(e) => {
                              const first = sizesOf(e.target.value)[0];
                              updateLine(idx, { product_id: e.target.value, size_id: first ? String(first.size_id) : "" });
                            }}
                            style={inputStyle}
                          >
                            <option value="">-- Chọn bánh --</option>
                            {importableProducts.map((p) => (
                              <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          {idx === 0 && <label style={labelStyle}>Kích cỡ</label>}
                          <select value={l.size_id} onChange={(e) => updateLine(idx, { size_id: e.target.value })} style={inputStyle} disabled={!l.product_id}>
                            {sizes.map((s) => (
                              <option key={s.size_id} value={s.size_id}>{s.size_name} (tồn {s.stock_quantity})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          {idx === 0 && <label style={labelStyle}>SL</label>}
                          <input type="number" min="1" value={l.quantity} onChange={(e) => updateLine(idx, { quantity: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                          {idx === 0 && <label style={labelStyle}>Giá nhập (đ)</label>}
                          <input type="number" min="0" step="1000" placeholder="0" value={l.import_price} onChange={(e) => updateLine(idx, { import_price: e.target.value })} style={inputStyle} />
                        </div>
                        <div style={{ textAlign: "right", fontWeight: "700", fontSize: "13px", color: "#1e293b", paddingBottom: "11px" }}>
                          {formatVND(lineTotal(l), " đ")}
                        </div>
                        <button
                          type="button"
                          aria-label="Xóa dòng"
                          disabled={form.lines.length === 1}
                          onClick={() => setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) })}
                          style={{ height: "40px", border: "1px solid #fecdd3", background: "#fff1f2", color: "#e11d48", borderRadius: "8px", cursor: form.lines.length === 1 ? "not-allowed" : "pointer", opacity: form.lines.length === 1 ? 0.4 : 1 }}
                        >
                          <ion-icon name="trash-outline"></ion-icon>
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="btn-pill-outline"
                  style={{ marginTop: "12px", padding: "6px 14px", fontSize: "12.5px" }}
                  onClick={() => setForm({ ...form, lines: [...form.lines, emptyLine()] })}
                >
                  <ion-icon name="add"></ion-icon>
                  <span>Thêm dòng</span>
                </button>
              </div>

              <div style={{ marginTop: "16px" }}>
                <label style={labelStyle}>Ghi chú</label>
                <textarea
                  rows="2"
                  placeholder="VD: Nhập bánh mousse cho tuần lễ hội..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={inputStyle}
                ></textarea>
              </div>

              <div className="order-receipt-total">
                <span>Tổng Tiền Nhập:</span>
                <span className="order-receipt-total-amount">{formatVND(formTotal, " đ")}</span>
              </div>

              <div className="order-modal-footer">
                <div className="order-modal-footer-actions">
                  <button type="button" className="order-btn-secondary" disabled={actionLoading} onClick={() => handleSubmit("Pending")}>
                    <ion-icon name="save-outline"></ion-icon>
                    <span>Lưu Phiếu Tạm</span>
                  </button>
                  <button type="button" className="btn-pill-primary order-btn-primary" disabled={actionLoading} onClick={() => handleSubmit("Completed")}>
                    <ion-icon name="checkmark-done-outline"></ion-icon>
                    <span>Lưu &amp; Nhập Kho</span>
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

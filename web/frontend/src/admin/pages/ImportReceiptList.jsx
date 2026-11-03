import { useCallback, useEffect, useState } from "react";
import AdminHeader from "../components/AdminHeader";
import { ExcelImportButtons, ExcelErrorTable } from "../components/ExcelImport";
import { adminImportReceiptsApi, adminProductsApi } from "../../api/admin";
import { formatVND, formatDateTime, apiErrorMessage, IMPORT_STATUS } from "../../utils/format";
import popup from "../../utils/popup";
import usePopupStore from "../../store/popupStore";
import { saveBlob, downloadErrorMessage } from "../../utils/download";
import "./OrderList.css";
import "./AdminModal.css";

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

const emptyLine = () => ({ product_id: "", size_id: "", quantity: 1, import_price: "", note: "" });

// Dòng đọc từ file Excel -> dòng của form tạo phiếu
const excelToLine = (l) => ({
  product_id: String(l.product_id),
  size_id: String(l.size_id),
  quantity: l.quantity,
  import_price: Number(l.import_price),
  note: l.note || "",
});
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
  const [exportingPdf, setExportingPdf] = useState(false);
  const [form, setForm] = useState(null);
  const [excelBusy, setExcelBusy] = useState(false);
  // Kết quả đọc file Excel có lỗi: { fileName, lines, errors }
  const [excelResult, setExcelResult] = useState(null);

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
          note: l.note?.trim() || null,
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

  // ===== Nhập phiếu từ file Excel: đọc file -> điền sẵn form tạo phiếu, người dùng chọn NCC rồi mới lưu =====
  const fillFormFromExcel = (lines, fileName) => {
    setExcelResult(null);
    setForm({ ...emptyForm(), lines: lines.map(excelToLine) });
    popup.success(`Đã nạp ${lines.length} dòng từ "${fileName}". Chọn nhà cung cấp, kiểm tra lại rồi lưu phiếu.`);
  };

  const handleExcelFile = async (file) => {
    setExcelBusy(true);
    try {
      const res = await adminImportReceiptsApi.previewExcel(file);
      // Tải lại danh sách bánh để form chọn được cả bánh / kích cỡ mới thêm sau khi mở trang
      await loadData();
      const { lines, errors } = res.data;
      if (errors.length > 0) setExcelResult({ fileName: file.name, lines, errors });
      else fillFormFromExcel(lines, file.name);
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không đọc được file Excel"));
    } finally {
      setExcelBusy(false);
    }
  };

  const handleExportPdf = async () => {
    const receipt = selected;
    setExportingPdf(true);
    try {
      const blob = await adminImportReceiptsApi.exportPdf(receipt.import_id);
      saveBlob(blob, `phieu-nhap-${receipt.import_code}.pdf`);
    } catch (err) {
      popup.error(await downloadErrorMessage(err, "Không xuất được phiếu nhập PDF"));
    } finally {
      setExportingPdf(false);
    }
  };

  const selectedStatus = selected ? IMPORT_STATUS[selected.status] || {} : {};
  const selectedId = selected?.import_id;
  const selectedIndex = selected ? filtered.findIndex((r) => r.import_id === selectedId) : -1;

  const openReceipt = (r) => setSelected(r);
  const closePanel = () => setSelected(null);

  // Chuyển sang phiếu trước/sau trong danh sách đang lọc, tự lật trang nếu phiếu nằm ở trang khác
  const goToSibling = (step) => {
    const target = filtered[selectedIndex + step];
    if (selectedIndex < 0 || !target) return;
    openReceipt(target);
    setCurrentPage(Math.floor((selectedIndex + step) / PAGE_SIZE) + 1);
  };

  // Không truyền deps để handler luôn đọc danh sách mới nhất
  useEffect(() => {
    if (!selected) return;
    const handleKeyDown = (e) => {
      // Nhường phím cho hộp thoại xác nhận và form tạo phiếu nếu đang mở
      if (usePopupStore.getState().dialog.isOpen || form || excelResult) return;
      const typing = e.target.closest?.("input, textarea, select");
      if (typing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === "Escape") {
        closePanel();
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        goToSibling(e.key === "ArrowUp" ? -1 : 1);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  // Giữ dòng đang xem trong tầm nhìn khi chuyển phiếu bằng phím/nút
  useEffect(() => {
    if (selectedId) document.querySelector(`[data-import-id="${selectedId}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selectedId, page]);

  return (
    <div className={`order-page ${selected ? "has-panel" : ""}`}>
      <AdminHeader />

      <div className="admin-page-container">
        {/* Header Row */}
        <div className="admin-page-header-row">
          <div className="admin-page-title-group">
            <h1>Phiếu Nhập Hàng</h1>
            <p>Nhập bánh từ nhà cung cấp &amp; cộng tồn kho theo từng kích cỡ</p>
          </div>

          <div className="admin-page-actions">
            <ExcelImportButtons
              downloadTemplate={adminImportReceiptsApi.downloadExcelTemplate}
              templateFilename="mau-phieu-nhap.xlsx"
              onFile={handleExcelFile}
              busy={excelBusy}
              disabled={loading}
            />
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

            <div style={{ fontSize: "13px", color: "#8c9ba5", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span>
                Hiển thị <span style={{ color: "#1e293b", fontWeight: "800" }}>{filtered.length}</span> phiếu nhập
              </span>
              {filtered.length > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: "500" }}>
                  · <ion-icon name="open-outline" style={{ fontSize: "14px" }}></ion-icon> Bấm vào phiếu để xem chi tiết bên cạnh
                </span>
              )}
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
                  <th className="col-actions" aria-label="Xem chi tiết"></th>
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
                    <tr
                      key={r.import_id}
                      data-import-id={r.import_id}
                      className={`order-row ${selectedId === r.import_id ? "is-selected" : ""}`}
                      tabIndex={0}
                      title="Bấm để xem chi tiết phiếu nhập"
                      onClick={() => openReceipt(r)}
                      onKeyDown={(e) => {
                        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          openReceipt(r);
                        }
                      }}
                    >
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
                      <td className="col-actions" aria-hidden="true">
                        <ion-icon name="chevron-forward-outline"></ion-icon>
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
                      <div key={idx}>
                        <div
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
                        {/* Ghi chú từng dòng chỉ có khi nạp từ Excel */}
                        {l.note && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", fontSize: "12px", color: "#64748b" }}>
                            <ion-icon name="chatbox-ellipses-outline"></ion-icon>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Ghi chú: {l.note}</span>
                            <button
                              type="button"
                              aria-label="Bỏ ghi chú dòng này"
                              title="Bỏ ghi chú"
                              onClick={() => updateLine(idx, { note: "" })}
                              style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer", padding: 0, display: "inline-flex" }}
                            >
                              <ion-icon name="close-circle-outline"></ion-icon>
                            </button>
                          </div>
                        )}
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

        {/* Modal lỗi khi đọc file Excel phiếu nhập */}
        {excelResult && (
          <div className="order-modal-overlay">
            <div className="order-modal" role="dialog" aria-modal="true" aria-labelledby="excel-result-title" style={{ maxWidth: "720px" }}>
              <div className="order-modal-header">
                <div>
                  <span className="order-modal-eyebrow">NHẬP PHIẾU TỪ EXCEL</span>
                  <h3 id="excel-result-title" className="order-modal-title">File có dòng chưa hợp lệ</h3>
                </div>
                <button type="button" className="order-modal-close" aria-label="Đóng" onClick={() => setExcelResult(null)}>
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>

              <p className="excel-hint">
                File <strong>{excelResult.fileName}</strong> có dòng bị lỗi. Sửa các dòng dưới đây trong Excel rồi chọn lại file
                {excelResult.lines.length > 0
                  ? `, hoặc bỏ qua chúng và tạo phiếu với ${excelResult.lines.length} dòng hợp lệ.`
                  : "."}
              </p>
              <ExcelErrorTable errors={excelResult.errors} />

              <div className="order-modal-footer">
                <div className="order-modal-footer-actions">
                  <button type="button" className="order-btn-secondary" onClick={() => setExcelResult(null)}>
                    <ion-icon name="create-outline"></ion-icon>
                    <span>Đóng &amp; Sửa File</span>
                  </button>
                  {excelResult.lines.length > 0 && (
                    <button
                      type="button"
                      className="btn-pill-primary order-btn-primary"
                      onClick={() => fillFormFromExcel(excelResult.lines, excelResult.fileName)}
                    >
                      <ion-icon name="arrow-forward-outline"></ion-icon>
                      <span>Bỏ Qua Dòng Lỗi ({excelResult.lines.length} dòng hợp lệ)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Panel chi tiết phiếu bên phải: bấm vào dòng nào trong bảng thì hiện ngay phiếu đó */}
      {selected && (
        <>
          {/* Nền mờ chỉ hiện khi panel nổi đè lên bảng (màn hình hẹp) — bấm để đóng */}
          <div className="order-panel-backdrop" onClick={closePanel} aria-hidden="true" />

          <aside className="order-panel" aria-labelledby="import-panel-title">
            <div className="order-panel-header">
              <div className="order-panel-heading">
                <span className="order-panel-eyebrow">Chi tiết phiếu nhập</span>
                <div className="order-panel-title-row">
                  <h3 id="import-panel-title" className="order-panel-title">#{selected.import_code}</h3>
                  <span className={`badge-pill order-badge-sm ${selectedStatus.badge || ""}`}>
                    {selectedStatus.label || selected.status}
                  </span>
                </div>
                <span className="order-panel-subtitle">Ngày nhập {formatDateTime(selected.import_date)}</span>
              </div>
              <div className="order-panel-nav">
                {selectedIndex >= 0 && (
                  <span className="order-panel-position">
                    {selectedIndex + 1}/{filtered.length}
                  </span>
                )}
                <button
                  type="button"
                  className="order-icon-btn"
                  disabled={selectedIndex <= 0}
                  onClick={() => goToSibling(-1)}
                  title="Phiếu trước (phím ↑)"
                  aria-label="Phiếu trước"
                >
                  <ion-icon name="chevron-up-outline"></ion-icon>
                </button>
                <button
                  type="button"
                  className="order-icon-btn"
                  disabled={selectedIndex < 0 || selectedIndex >= filtered.length - 1}
                  onClick={() => goToSibling(1)}
                  title="Phiếu sau (phím ↓)"
                  aria-label="Phiếu sau"
                >
                  <ion-icon name="chevron-down-outline"></ion-icon>
                </button>
                <button type="button" className="order-icon-btn" onClick={closePanel} title="Đóng (Esc)" aria-label="Đóng chi tiết phiếu">
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>
            </div>

            <div className="order-panel-body">
              {/* Nhà cung cấp */}
              <section className="order-panel-section">
                <h4 className="order-section-label">Nhà cung cấp</h4>
                <div className="order-panel-customer">
                  <span className="order-panel-avatar" aria-hidden="true">
                    <ion-icon name="business-outline"></ion-icon>
                  </span>
                  <div className="order-panel-customer-info">
                    <div className="order-customer-name">{selected.supplier_name}</div>
                    <div className="order-customer-phone">{selected.supplier_code}</div>
                  </div>
                </div>
              </section>

              {selected.notes && (
                <div className="order-note-box">
                  <strong>Ghi chú:</strong> {selected.notes}
                </div>
              )}

              {/* Danh sách bánh nhập */}
              <section className="order-panel-section">
                <div className="order-panel-section-head">
                  <h4 className="order-section-label">Danh sách bánh nhập</h4>
                  <span className="order-panel-section-meta">
                    {selected.total_quantity} bánh · {selected.details.length} mặt hàng
                  </span>
                </div>
                <ul className="order-panel-items">
                  {selected.details.map((d) => (
                    <li key={`${d.product_id}-${d.size_id}`} className="order-panel-item">
                      <span className="order-panel-qty">{d.quantity}x</span>
                      <div className="order-panel-item-info">
                        <div className="order-panel-item-name">{d.product_name}</div>
                        <div className="order-panel-item-meta">
                          {d.size_name} · Giá nhập {formatVND(d.import_price, " đ")}
                        </div>
                      </div>
                      <span className="order-receipt-item-price">{formatVND(d.total_price, " đ")}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="order-panel-section">
                <div className="order-panel-summary">
                  <div className="order-receipt-total">
                    <span>Tổng tiền nhập</span>
                    <span className="order-receipt-total-amount">{formatVND(selected.total_amount, " đ")}</span>
                  </div>
                </div>
              </section>
            </div>

            {/* Thao tác nghiệp vụ luôn ghim ở đáy panel */}
            <div className="order-panel-footer">
              {selected.status === "Pending" && (
                <button
                  type="button"
                  className="btn-pill-primary order-btn-primary"
                  disabled={actionLoading}
                  onClick={() => handleChangeStatus("Completed")}
                >
                  <ion-icon name="checkmark-done-outline"></ion-icon>
                  <span>Xác Nhận Nhập Kho</span>
                </button>
              )}
              <div className="order-panel-footer-row">
                {/* Hủy phiếu để bên trái, tách khỏi nút chính để tránh bấm nhầm */}
                {selected.status === "Pending" && (
                  <button
                    type="button"
                    className="order-btn-cancel"
                    disabled={actionLoading}
                    onClick={() => handleChangeStatus("Cancelled")}
                    title="Hủy phiếu nhập, tồn kho không thay đổi"
                  >
                    <ion-icon name="close-circle-outline"></ion-icon>
                    <span>Hủy Phiếu</span>
                  </button>
                )}
                <button
                  type="button"
                  className="order-btn-secondary"
                  disabled={exportingPdf}
                  onClick={handleExportPdf}
                  title="Tải phiếu nhập kho dạng PDF để in và ký xác nhận"
                >
                  <ion-icon name={exportingPdf ? "hourglass-outline" : "document-text-outline"}></ion-icon>
                  <span>{exportingPdf ? "Đang xuất..." : "Xuất Phiếu PDF"}</span>
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

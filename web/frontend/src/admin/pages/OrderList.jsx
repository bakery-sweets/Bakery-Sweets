import { useCallback, useEffect, useState } from "react";
import AdminHeader from "../components/AdminHeader";
import { adminOrdersApi } from "../../api/admin";
import { formatVND, formatDateTime, apiErrorMessage, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "../../utils/format";

const URGENT_WINDOW_MS = 2 * 60 * 60 * 1000;

// Đơn chưa xong và giờ hẹn lấy bánh trong vòng 2 tiếng tới (hoặc đã quá giờ)
const isUrgent = (o) =>
  !["Completed", "Cancelled"].includes(o.status) &&
  !!o.pickup_time &&
  new Date(o.pickup_time).getTime() - Date.now() <= URGENT_WINDOW_MS;

// Nút chuyển bước tiếp theo trong modal (server trả next_statuses theo bảng chuyển trạng thái hợp lệ)
const NEXT_STEP = {
  Processing: { label: "Tiếp Nhận & Chuẩn Bị", icon: "restaurant-outline" },
  Ready: { label: "Báo Sẵn Sàng Tại Quầy", icon: "bag-check-outline" },
  Completed: { label: "Hoàn Tất Giao Bánh", icon: "checkmark-done-outline" },
};

// Đơn không phải COD phải được xác nhận thanh toán trước khi hoàn tất; đơn COD tự đánh dấu đã thu tiền
const needsPaymentFirst = (o) => o.payment_status !== "Paid" && o.payment_method !== "COD";

export default function OrderList() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const tabs = [
    { key: "all", label: "Tất Cả" },
    { key: "Pending", label: "Chờ Tiếp Nhận" },
    { key: "Processing", label: "Đang Chuẩn Bị & Đóng Gói" },
    { key: "Ready", label: "Sẵn Sàng Tại Quầy" },
    { key: "Completed", label: "Đã Hoàn Tất" },
    { key: "Cancelled", label: "Đã Hủy" },
  ];

  const loadOrders = useCallback(async () => {
    try {
      const res = await adminOrdersApi.getAll();
      setOrders(res.data);
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "Không tải được danh sách đơn hàng"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const openOrder = (o) => {
    setSelectedOrder(o);
    setModalError("");
    setCancelMode(false);
    setCancelReason("");
  };

  const runOrderAction = async (request, fallback) => {
    setActionLoading(true);
    setModalError("");
    try {
      const res = await request();
      const updated = res.data;
      setOrders((prev) => prev.map((o) => (o.order_id === updated.order_id ? updated : o)));
      setSelectedOrder(updated);
      setCancelMode(false);
      setCancelReason("");
    } catch (err) {
      setModalError(apiErrorMessage(err, fallback));
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeStatus = (status) =>
    runOrderAction(() => adminOrdersApi.updateStatus(selectedOrder.order_id, status), "Cập nhật trạng thái thất bại");

  const handleCancelOrder = () => {
    const reason = cancelReason.trim();
    if (!reason) {
      setModalError("Vui lòng nhập lý do hủy đơn hàng");
      return;
    }
    runOrderAction(() => adminOrdersApi.updateStatus(selectedOrder.order_id, "Cancelled", reason), "Hủy đơn hàng thất bại");
  };

  const handleConfirmPayment = () => {
    if (!window.confirm(`Xác nhận đơn #${selectedOrder.order_code} đã thanh toán ${formatVND(selectedOrder.final_cost, " đ")}?`)) return;
    runOrderAction(() => adminOrdersApi.confirmPayment(selectedOrder.order_id), "Xác nhận thanh toán thất bại");
  };

  const countFor = (key) => (key === "all" ? orders.length : orders.filter((o) => o.status === key).length);

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "all") return true;
    return o.status === activeTab;
  });

  return (
    <>
      <AdminHeader />

      <div className="admin-page-container">
        {/* Page Title & Actions */}
        <div className="admin-page-header-row">
          <div className="admin-page-title-group">
            <h1>Quản Lý Đơn Hàng &amp; Hóa Đơn</h1>
            <p>Theo dõi {orders.length} đơn đặt hàng, lịch hẹn nhận tại quầy &amp; đối soát hóa đơn bán lẻ</p>
          </div>

          <div className="admin-page-actions">
            <button className="btn-pill-outline" type="button" onClick={() => window.print()}>
              <ion-icon name="print-outline"></ion-icon>
              <span>In Bảng Đối Soát</span>
            </button>
            <button className="btn-pill-primary" type="button" onClick={() => { setLoading(true); loadOrders(); }}>
              <ion-icon name="refresh-outline"></ion-icon>
              <span>Làm Mới (Live)</span>
            </button>
          </div>
        </div>

        {/* Tab Pills Filter */}
        <div className="admin-filter-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`tab-pill-btn ${activeTab === t.key ? "active" : ""}`}
            >
              {t.label} ({countFor(t.key)})
            </button>
          ))}
        </div>

        {/* Main Orders Table */}
        <div className="admin-card-box">
          <div className="admin-table-clean-wrapper">
            <table className="admin-table-clean">
              <thead>
                <tr>
                  <th>MÃ ĐƠN</th>
                  <th>KHÁCH HÀNG &amp; SĐT</th>
                  <th>HẸN LẤY BÁNH</th>
                  <th>MÓN &amp; KÍCH CỠ</th>
                  <th>TỔNG TIỀN</th>
                  <th>THANH TOÁN</th>
                  <th>TRẠNG THÁI</th>
                  <th style={{ textAlign: "right" }}>CHI TIẾT</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", color: "#8c9ba5" }}>
                      {loading ? "Đang tải..." : error || "Không có đơn hàng nào."}
                    </td>
                  </tr>
                )}
                {filteredOrders.map((o) => {
                  const urgent = isUrgent(o);
                  const st = ORDER_STATUS[o.status] || {};
                  return (
                  <tr key={o.order_id}>
                    <td>
                      <span style={{ fontWeight: "800", color: "#de5d7c", fontSize: "14px" }}>
                        #{o.order_code}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: "700", color: "#1e293b" }}>{o.recipient_name}</div>
                      <div style={{ fontSize: "12px", color: "#8c9ba5" }}>{o.recipient_phone}</div>
                    </td>
                    <td>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <ion-icon name="time-outline" style={{ color: urgent ? "#de5d7c" : "#8c9ba5" }}></ion-icon>
                        <span style={{ fontWeight: urgent ? "800" : "600", color: urgent ? "#de5d7c" : "#334155", fontSize: "12.5px" }}>
                          {formatDateTime(o.pickup_time)}
                        </span>
                      </div>
                      {o.notes && (
                        <div style={{ fontSize: "11px", color: "#d97706", marginTop: "3px", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          ✍️ {o.notes}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: "12.5px", color: "#334155" }}>
                        {o.details.map((it) => (
                          <div key={`${it.product_id}-${it.size_id}`} style={{ marginBottom: "2px" }}>
                            <span style={{ fontWeight: "700" }}>{it.quantity}x</span> {it.product_name} <span style={{ color: "#8c9ba5" }}>({it.size_name})</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: "800", color: "#1e293b", fontSize: "14px" }}>
                        {formatVND(o.final_cost, " đ")}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge-pill ${o.payment_status === "Paid" ? "mint" : "gray"}`}
                        style={{ fontSize: "11.5px" }}
                        title={PAYMENT_STATUS[o.payment_status] || o.payment_status}
                      >
                        {PAYMENT_METHOD[o.payment_method] || o.payment_method}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-pill ${st.badge}`} style={{ fontSize: "11.5px" }}>
                        <span className={`dot-status ${st.dot}`}></span>
                        {st.label || o.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => openOrder(o)}
                        className="btn-pill-outline"
                        style={{ padding: "6px 14px", fontSize: "12px" }}
                      >
                        Xem Phiếu
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Xem Phiếu / Chi Tiết Hóa Đơn */}
        {selectedOrder && (
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
                maxWidth: "560px",
                maxHeight: "92vh",
                overflowY: "auto",
                padding: "28px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                border: "1px solid #f0f1f4",
              }}
            >
              {/* Modal Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f2f4", paddingBottom: "14px", marginBottom: "18px" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "#de5d7c", textTransform: "uppercase", letterSpacing: "1px" }}>
                    PHIẾU HÓA ĐƠN BÁN LẺ
                  </span>
                  <h3 style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: "800", color: "#1e293b" }}>
                    #{selectedOrder.order_code}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  style={{ background: "#f8fafc", border: "none", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", fontSize: "18px", color: "#64748b" }}
                >
                  ✕
                </button>
              </div>

              {/* Info meta */}
              <div style={{ background: "#fff0f4", borderRadius: "14px", padding: "12px 16px", marginBottom: "16px", fontSize: "12.5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "#64748b" }}>Khách hàng:</span>
                  <span style={{ fontWeight: "700", color: "#1e293b" }}>{selectedOrder.recipient_name} ({selectedOrder.recipient_phone})</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "#64748b" }}>Hẹn nhận bánh:</span>
                  <span style={{ fontWeight: "700", color: "#de5d7c" }}>{formatDateTime(selectedOrder.pickup_time)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ color: "#64748b" }}>Trạng thái:</span>
                  <span className={`badge-pill ${ORDER_STATUS[selectedOrder.status]?.badge || ""}`} style={{ fontSize: "11px" }}>
                    <span className={`dot-status ${ORDER_STATUS[selectedOrder.status]?.dot || ""}`}></span>
                    {ORDER_STATUS[selectedOrder.status]?.label || selectedOrder.status}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#64748b" }}>Thanh toán:</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: "700", color: "#1e293b" }}>
                      {PAYMENT_METHOD[selectedOrder.payment_method] || selectedOrder.payment_method}
                    </span>
                    <span className={`badge-pill ${selectedOrder.payment_status === "Paid" ? "mint" : "gray"}`} style={{ fontSize: "11px" }}>
                      {PAYMENT_STATUS[selectedOrder.payment_status] || selectedOrder.payment_status}
                    </span>
                    {selectedOrder.payment_status === "Unpaid" && selectedOrder.status !== "Cancelled" && (
                      <button
                        type="button"
                        className="btn-pill-outline"
                        style={{ padding: "3px 10px", fontSize: "11px" }}
                        disabled={actionLoading}
                        onClick={handleConfirmPayment}
                      >
                        Xác nhận đã thu
                      </button>
                    )}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "11.5px", fontWeight: "800", color: "#8c9ba5", textTransform: "uppercase" }}>Danh Sách Bánh</span>
                <div style={{ marginTop: "8px", borderTop: "1px solid #f8f9fa" }}>
                  {selectedOrder.details.map((it) => (
                    <div key={`${it.product_id}-${it.size_id}`} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f8f9fa", fontSize: "13px" }}>
                      <span><strong>{it.quantity}x</strong> {it.product_name} <small style={{ color: "#8c9ba5" }}>({it.size_name})</small></span>
                      <span style={{ fontWeight: "700" }}>{formatVND(it.total_price, " đ")}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div style={{ background: "#fef9ee", border: "1px solid #fef3c7", borderRadius: "12px", padding: "10px 14px", marginBottom: "16px", fontSize: "12px", color: "#b45309" }}>
                  <strong>Ghi chú đơn hàng:</strong> {selectedOrder.notes}
                </div>
              )}

              {Number(selectedOrder.discount_amount) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                  <span>Giảm giá:</span>
                  <span style={{ fontWeight: "700", color: "#10b981" }}>-{formatVND(selectedOrder.discount_amount, " đ")}</span>
                </div>
              )}

              {/* Total & Action */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "2px dashed #e2e8f0", marginBottom: "20px" }}>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#64748b" }}>Tổng Thanh Toán:</span>
                <span style={{ fontSize: "20px", fontWeight: "800", color: "#de5d7c" }}>{formatVND(selectedOrder.final_cost, " đ")}</span>
              </div>

              {/* Timeline lịch sử trạng thái */}
              {selectedOrder.status_logs?.length > 0 && (
                <div style={{ marginBottom: "18px" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: "800", color: "#8c9ba5", textTransform: "uppercase" }}>Lịch Sử Xử Lý</span>
                  <div style={{ marginTop: "10px" }}>
                    {selectedOrder.status_logs.map((log, idx) => {
                      const isLast = idx === selectedOrder.status_logs.length - 1;
                      // Log thanh toán giữ nguyên trạng thái đơn (old_status === new_status)
                      const isPaymentLog = log.old_status === log.new_status;
                      const color = log.new_status === "Cancelled" ? "#ef4444" : isPaymentLog ? "#10b981" : "#de5d7c";
                      return (
                        <div key={log.log_id} style={{ display: "flex", gap: "12px" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: color, marginTop: "4px", flexShrink: 0 }}></span>
                            {!isLast && <span style={{ width: "2px", flex: 1, background: "#f1f2f4", margin: "2px 0" }}></span>}
                          </div>
                          <div style={{ paddingBottom: isLast ? 0 : "12px", fontSize: "12.5px" }}>
                            <div style={{ fontWeight: "700", color: "#1e293b" }}>
                              {isPaymentLog ? "Xác nhận thanh toán" : ORDER_STATUS[log.new_status]?.label || log.new_status}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "#8c9ba5" }}>
                              {formatDateTime(log.changed_at)}{log.changed_by ? ` · ${log.changed_by}` : ""}
                            </div>
                            {log.note && (
                              <div style={{ fontSize: "12px", color: log.new_status === "Cancelled" ? "#b91c1c" : "#475569", marginTop: "2px" }}>
                                {log.note}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chuyển trạng thái */}
              {selectedOrder.next_statuses?.length > 0 && (
                <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "12px", marginBottom: "16px" }}>
                  {!cancelMode ? (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {selectedOrder.next_statuses.filter((s) => NEXT_STEP[s]).map((s) => {
                        const blocked = s === "Completed" && needsPaymentFirst(selectedOrder);
                        const codUnpaid = s === "Completed" && selectedOrder.payment_status !== "Paid" && !blocked;
                        return (
                          <button
                            key={s}
                            type="button"
                            className="btn-pill-primary"
                            style={{ flex: 1, justifyContent: "center", opacity: blocked ? 0.5 : 1 }}
                            disabled={actionLoading || blocked}
                            title={blocked ? "Cần xác nhận thanh toán trước khi hoàn tất" : undefined}
                            onClick={() => handleChangeStatus(s)}
                          >
                            <ion-icon name={NEXT_STEP[s].icon}></ion-icon>
                            <span>{codUnpaid ? "Thu Tiền & Hoàn Tất" : NEXT_STEP[s].label}</span>
                          </button>
                        );
                      })}
                      {selectedOrder.next_statuses.includes("Cancelled") && (
                        <button
                          type="button"
                          className="btn-pill-outline"
                          style={{ justifyContent: "center", color: "#ef4444" }}
                          disabled={actionLoading}
                          onClick={() => { setCancelMode(true); setModalError(""); }}
                        >
                          <ion-icon name="close-circle-outline"></ion-icon>
                          <span>Hủy Đơn</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#b91c1c" }}>
                        Lý do hủy đơn (bắt buộc) — tồn kho sẽ được hoàn lại
                      </label>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        rows={2}
                        autoFocus
                        placeholder="VD: Khách không đến nhận, hết nguyên liệu..."
                        style={{ width: "100%", marginTop: "6px", padding: "8px 12px", borderRadius: "10px", border: "1px solid #fecaca", fontFamily: "inherit", fontSize: "13px", resize: "vertical", boxSizing: "border-box" }}
                      />
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <button
                          type="button"
                          className="btn-pill-outline"
                          style={{ flex: 1, justifyContent: "center" }}
                          disabled={actionLoading}
                          onClick={() => { setCancelMode(false); setCancelReason(""); setModalError(""); }}
                        >
                          <span>Quay Lại</span>
                        </button>
                        <button
                          type="button"
                          className="btn-pill-primary"
                          style={{ flex: 1, justifyContent: "center", background: "#ef4444" }}
                          disabled={actionLoading || !cancelReason.trim()}
                          onClick={handleCancelOrder}
                        >
                          <span>Xác Nhận Hủy Đơn</span>
                        </button>
                      </div>
                    </div>
                  )}
                  {!cancelMode && needsPaymentFirst(selectedOrder) && selectedOrder.next_statuses.includes("Completed") && (
                    <div style={{ fontSize: "11.5px", color: "#d97706", marginTop: "8px" }}>
                      Đơn thanh toán online cần được xác nhận đã thanh toán trước khi hoàn tất.
                    </div>
                  )}
                </div>
              )}

              {modalError && (
                <div style={{ color: "#b91c1c", fontWeight: "600", fontSize: "12.5px", marginBottom: "12px" }}>{modalError}</div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-pill-outline"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => window.print()}
                >
                  <ion-icon name="print-outline"></ion-icon>
                  <span>In Phiếu Thu</span>
                </button>
                <button
                  type="button"
                  className="btn-pill-primary"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setSelectedOrder(null)}
                >
                  <span>Đóng Lại</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

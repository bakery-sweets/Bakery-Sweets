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

export default function OrderList() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const tabs = [
    { key: "all", label: "Tất Cả" },
    { key: "Pending", label: "Chờ Tiếp Nhận" },
    { key: "Processing", label: "Đang Chuẩn Bị & Đóng Gói" },
    { key: "Ready", label: "Sẵn Sàng Tại Quầy" },
    { key: "Completed", label: "Đã Hoàn Tất" },
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
                        onClick={() => setSelectedOrder(o)}
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
                maxWidth: "520px",
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
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Hẹn nhận bánh:</span>
                  <span style={{ fontWeight: "700", color: "#de5d7c" }}>{formatDateTime(selectedOrder.pickup_time)}</span>
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

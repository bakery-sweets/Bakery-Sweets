import { useState } from "react";
import AdminHeader from "../components/AdminHeader";

export default function OrderList() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const tabs = [
    { key: "all", label: "Tất Cả", count: 38 },
    { key: "Pending", label: "Chờ Tiếp Nhận", count: 3 },
    { key: "Processing", label: "Bếp Đang Làm", count: 8 },
    { key: "Ready", label: "Sẵn Sàng Tại Quầy", count: 12 },
    { key: "Completed", label: "Đã Hoàn Tất", count: 15 },
  ];

  const orders = [
    {
      id: "ORD-9821",
      customer: "Nguyễn Bảo Ngọc",
      phone: "0901234567",
      pickupTime: "14:30 Hôm nay (Tràng Tiền)",
      isUrgent: true,
      items: [
        { name: "Framboise Entremet (16cm)", size: "Size S", qty: 1, price: "650.000 đ" },
        { name: "Luxury Macaron Box (6 pcs)", size: "Tiêu chuẩn", qty: 2, price: "240.000 đ" },
      ],
      total: "890.000 đ",
      notes: "Viết chữ socola: 'Chúc mừng sinh nhật Bảo Ngọc 22 tuổi', tặng 1 nến số.",
      paymentMethod: "VietQR Đã Cọc",
      paymentStatus: "Paid",
      status: "Ready",
      statusLabel: "Sẵn sàng",
      badgeType: "mint",
    },
    {
      id: "ORD-9820",
      customer: "Trần Đình Khang",
      phone: "0912345678",
      pickupTime: "16:00 Hôm nay (Ship Hoàn Kiếm)",
      isUrgent: false,
      items: [
        { name: "Saint-Honoré Caramel (20cm)", size: "Size M", qty: 1, price: "1.250.000 đ" },
      ],
      total: "1.250.000 đ",
      notes: "Đóng hộp cao cấp thắt nơ đỏ tặng đối tác sự kiện.",
      paymentMethod: "Thẻ Tín Dụng",
      paymentStatus: "Paid",
      status: "Processing",
      statusLabel: "Đang decor",
      badgeType: "amber",
    },
    {
      id: "ORD-9819",
      customer: "Phạm Mai Chi",
      phone: "0987654321",
      pickupTime: "17:30 Hôm nay (Tại Quầy)",
      isUrgent: false,
      items: [
        { name: "Croissant Pure Butter AOP", size: "Tiêu chuẩn", qty: 4, price: "140.000 đ" },
        { name: "Café Rose Latte", size: "Ly 500ml", qty: 2, price: "180.000 đ" },
      ],
      total: "320.000 đ",
      notes: "Lấy bánh nóng vừa nướng xong, tách đá riêng.",
      paymentMethod: "Tiền Mặt",
      paymentStatus: "Paid",
      status: "Completed",
      statusLabel: "Hoàn tất",
      badgeType: "mint",
    },
    {
      id: "ORD-9818",
      customer: "Vũ Hải Đăng",
      phone: "0933445566",
      pickupTime: "18:00 Hôm nay (Tại Quầy)",
      isUrgent: false,
      items: [
        { name: "Tiramisu Mousse Cake", size: "Size L (24cm)", qty: 1, price: "260.000 đ" },
      ],
      total: "260.000 đ",
      notes: "Không cắm nến, chuẩn bị thêm 5 bộ dao nĩa.",
      paymentMethod: "VietQR Đã Cọc",
      paymentStatus: "Unpaid",
      status: "Pending",
      statusLabel: "Chờ duyệt",
      badgeType: "pink",
    },
  ];

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
            <h1>Lịch Đặt Bánh &amp; Hóa Đơn</h1>
            <p>Theo dõi 38 đơn đặt tiệc, lịch hẹn xuất xưởng &amp; đối soát hóa đơn bán lẻ</p>
          </div>

          <div className="admin-page-actions">
            <button className="btn-pill-outline" type="button" onClick={() => window.print()}>
              <ion-icon name="print-outline"></ion-icon>
              <span>In Bảng Đối Soát</span>
            </button>
            <button className="btn-pill-primary" type="button">
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
              {t.label} ({t.count})
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
                {filteredOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <span style={{ fontWeight: "800", color: "#de5d7c", fontSize: "14px" }}>
                        #{o.id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: "700", color: "#1e293b" }}>{o.customer}</div>
                      <div style={{ fontSize: "12px", color: "#8c9ba5" }}>{o.phone}</div>
                    </td>
                    <td>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <ion-icon name="time-outline" style={{ color: o.isUrgent ? "#de5d7c" : "#8c9ba5" }}></ion-icon>
                        <span style={{ fontWeight: o.isUrgent ? "800" : "600", color: o.isUrgent ? "#de5d7c" : "#334155", fontSize: "12.5px" }}>
                          {o.pickupTime}
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
                        {o.items.map((it, idx) => (
                          <div key={idx} style={{ marginBottom: "2px" }}>
                            <span style={{ fontWeight: "700" }}>{it.qty}x</span> {it.name} <span style={{ color: "#8c9ba5" }}>({it.size})</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: "800", color: "#1e293b", fontSize: "14px" }}>
                        {o.total}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-pill ${o.paymentMethod.includes("VietQR") ? "mint" : o.paymentMethod.includes("Thẻ") ? "cyan" : "gray"}`} style={{ fontSize: "11.5px" }}>
                        {o.paymentMethod}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-pill ${o.badgeType}`} style={{ fontSize: "11.5px" }}>
                        <span className={`dot-status ${o.badgeType === "mint" ? "green" : o.badgeType === "amber" ? "orange" : "pink"}`}></span>
                        {o.statusLabel}
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
                ))}
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
                    #{selectedOrder.id}
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
                  <span style={{ fontWeight: "700", color: "#1e293b" }}>{selectedOrder.customer} ({selectedOrder.phone})</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Hẹn nhận bánh:</span>
                  <span style={{ fontWeight: "700", color: "#de5d7c" }}>{selectedOrder.pickupTime}</span>
                </div>
              </div>

              {/* Items List */}
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "11.5px", fontWeight: "800", color: "#8c9ba5", textTransform: "uppercase" }}>Danh Sách Bánh</span>
                <div style={{ marginTop: "8px", borderTop: "1px solid #f8f9fa" }}>
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f8f9fa", fontSize: "13px" }}>
                      <span><strong>{it.qty}x</strong> {it.name} <small style={{ color: "#8c9ba5" }}>({it.size})</small></span>
                      <span style={{ fontWeight: "700" }}>{it.price}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div style={{ background: "#fef9ee", border: "1px solid #fef3c7", borderRadius: "12px", padding: "10px 14px", marginBottom: "16px", fontSize: "12px", color: "#b45309" }}>
                  <strong>Ghi chú bếp:</strong> {selectedOrder.notes}
                </div>
              )}

              {/* Total & Action */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "2px dashed #e2e8f0", marginBottom: "20px" }}>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#64748b" }}>Tổng Thanh Toán:</span>
                <span style={{ fontSize: "20px", fontWeight: "800", color: "#de5d7c" }}>{selectedOrder.total}</span>
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

import { useState } from "react";
import AdminHeader from "../components/AdminHeader";

export default function Statistical() {
  const [activePeriod, setActivePeriod] = useState("week");

  const periods = [
    { key: "today", label: "Hôm Nay" },
    { key: "week", label: "Tuần Này" },
    { key: "month", label: "Tháng Này" },
    { key: "quarter", label: "Quý Này" },
    { key: "year", label: "Năm 2026" },
  ];

  const topCakes = [
    { rank: 1, name: "Fraise Rose Mousse", category: "Mousse", sales: 248, revenue: "33.480.000 đ", percent: 92, trend: "+18%" },
    { rank: 2, name: "Tiramisu Mousse", category: "Mousse", sales: 195, revenue: "27.300.000 đ", percent: 78, trend: "+12%" },
    { rank: 3, name: "Plain Butter Croissant", category: "Croissant", sales: 340, revenue: "11.900.000 đ", percent: 65, trend: "+8%" },
    { rank: 4, name: "Dinosaur Almond Croissant", category: "Croissant", sales: 165, revenue: "9.075.000 đ", percent: 52, trend: "+15%" },
    { rank: 5, name: "Matcha Latte Cake", category: "Mousse", sales: 98, revenue: "13.720.000 đ", percent: 40, trend: "-4%" },
  ];

  return (
    <>
      <AdminHeader />

      <div className="admin-page-container">
        {/* Header Row */}
        <div className="admin-page-header-row">
          <div className="admin-page-title-group">
            <h1>Báo Cáo Doanh Thu &amp; Hiệu Suất</h1>
            <p>Phân tích tài chính, cơ cấu doanh số &amp; các dòng bánh bán chạy của tiệm</p>
          </div>

          <div className="admin-page-actions">
            <button className="btn-pill-outline" type="button">
              <ion-icon name="calendar-outline"></ion-icon>
              <span>13/10/2026 - 20/10/2026</span>
            </button>
            <button className="btn-pill-primary" type="button">
              <ion-icon name="document-text-outline"></ion-icon>
              <span>Xuất Báo Cáo Kế Toán</span>
            </button>
          </div>
        </div>

        {/* Period Pills */}
        <div className="admin-filter-tabs">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setActivePeriod(p.key)}
              className={`tab-pill-btn ${activePeriod === p.key ? "active" : ""}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 3 Metric Cards */}
        <div className="admin-grid-3" style={{ marginBottom: "22px" }}>
          <div className="dashboard-hero-card" style={{ minHeight: "160px" }}>
            <div className="kpi-card-header">
              <span className="kpi-label">DOANH THU TUẦN NÀY</span>
              <button className="kpi-circle-arrow" aria-label="Chi tiết">↗</button>
            </div>
            <div>
              <div className="kpi-big-value">114.850.000 đ</div>
              <div className="kpi-footer-row">
                <span className="hero-pill-badge">↑ +14.2% so với tuần trước</span>
              </div>
            </div>
          </div>

          <div className="kpi-card-white" style={{ minHeight: "160px" }}>
            <div className="kpi-card-header">
              <span className="kpi-label">TỔNG BÁNH XUẤT LÒ</span>
              <button className="kpi-circle-arrow" aria-label="Chi tiết">↗</button>
            </div>
            <div>
              <div className="kpi-big-value">1.046 <span style={{ fontSize: "18px", color: "#64748b" }}>bánh</span></div>
              <div className="kpi-footer-row">
                <span className="badge-pill mint">Bếp đạt 104% công suất</span>
              </div>
            </div>
          </div>

          <div className="kpi-card-white" style={{ minHeight: "160px" }}>
            <div className="kpi-card-header">
              <span className="kpi-label">LỢI NHUẬN GỘP ƯỚC TÍNH</span>
              <button className="kpi-circle-arrow" aria-label="Chi tiết">↗</button>
            </div>
            <div>
              <div className="kpi-big-value" style={{ color: "#10b981" }}>75.800.000 đ</div>
              <div className="kpi-footer-row">
                <span style={{ color: "#64748b" }}>Biên lợi nhuận gộp: <strong>66%</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* 2 Grid: Bar Chart & Donut Share */}
        <div className="admin-grid-split" style={{ marginBottom: "22px" }}>
          {/* Revenue by Day */}
          <div className="admin-card-box" style={{ margin: 0 }}>
            <div className="admin-card-box-header">
              <div className="card-title-group">
                <h3>Biểu Đồ Doanh Thu 7 Ngày Gần Nhất</h3>
                <p>Số liệu đối soát dòng tiền từ VietQR, Thẻ &amp; Tiền mặt</p>
              </div>
              <span className="badge-pill pink">Cao nhất: Thứ 7 (24.8M)</span>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: "180px", padding: "20px 10px 0" }}>
              {[
                { day: "Thứ 2", h: 45, rev: "11.2M", isPeak: false },
                { day: "Thứ 3", h: 55, rev: "14.5M", isPeak: false },
                { day: "Thứ 4", h: 50, rev: "13.1M", isPeak: false },
                { day: "Thứ 5", h: 68, rev: "18.2M", isPeak: false },
                { day: "Thứ 6", h: 80, rev: "20.4M", isPeak: false },
                { day: "Thứ 7", h: 100, rev: "24.8M", isPeak: true },
                { day: "CN", h: 92, rev: "22.6M", isPeak: false },
              ].map((b, idx) => (
                <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", gap: "6px" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: "700", color: b.isPeak ? "#de5d7c" : "#8c9ba5" }}>
                    {b.rev}
                  </span>
                  <div
                    style={{
                      width: "36px",
                      height: `${b.h}%`,
                      background: b.isPeak
                        ? "linear-gradient(180deg, #de5d7c 0%, #c74767 100%)"
                        : "linear-gradient(180deg, #fce4ec 0%, #f8bbd0 100%)",
                      borderRadius: "12px 12px 4px 4px",
                      boxShadow: b.isPeak ? "0 4px 12px rgba(222, 93, 124, 0.35)" : "none",
                    }}
                  ></div>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: b.isPeak ? "#de5d7c" : "#64748b" }}>
                    {b.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Category Share */}
          <div className="admin-card-box" style={{ margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="admin-card-box-header">
                <div className="card-title-group">
                  <h3>Cơ Cấu Doanh Thu</h3>
                  <p>Tỷ trọng doanh số theo danh mục bánh</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "10px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "700", marginBottom: "6px" }}>
                    <span>Mousse Cake</span>
                    <span style={{ color: "#de5d7c" }}>56% (64.3M đ)</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "#f1f2f4", borderRadius: "9999px", overflow: "hidden" }}>
                    <div style={{ width: "56%", height: "100%", background: "#de5d7c", borderRadius: "9999px" }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "700", marginBottom: "6px" }}>
                    <span>Croissant &amp; Pastry</span>
                    <span style={{ color: "#f59e0b" }}>28% (32.1M đ)</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "#f1f2f4", borderRadius: "9999px", overflow: "hidden" }}>
                    <div style={{ width: "28%", height: "100%", background: "#f59e0b", borderRadius: "9999px" }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "700", marginBottom: "6px" }}>
                    <span>Trà &amp; Thức Uống</span>
                    <span style={{ color: "#10b981" }}>16% (18.4M đ)</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "#f1f2f4", borderRadius: "9999px", overflow: "hidden" }}>
                    <div style={{ width: "16%", height: "100%", background: "#10b981", borderRadius: "9999px" }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: "#fff0f4", borderRadius: "14px", padding: "12px", marginTop: "16px", fontSize: "12px", color: "#de5d7c", fontWeight: "600" }}>
              💡 Mousse Cake dâu và socola tiếp tục là trụ cột đóng góp doanh thu lớn nhất.
            </div>
          </div>
        </div>

        {/* Top Products Table */}
        <div className="admin-card-box">
          <div className="admin-card-box-header">
            <div className="card-title-group">
              <h3>Bảng Xếp Hạng Món Bánh Bán Chạy Nhất</h3>
              <p>Thống kê số lượng bánh tiêu thụ &amp; doanh thu thực tế</p>
            </div>
          </div>

          <div className="admin-table-clean-wrapper">
            <table className="admin-table-clean">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>HẠNG</th>
                  <th>TÊN BÁNH</th>
                  <th>DANH MỤC</th>
                  <th>SỐ LƯỢNG BÁN</th>
                  <th>DOANH THU</th>
                  <th>TĂNG TRƯỞNG</th>
                </tr>
              </thead>
              <tbody>
                {topCakes.map((c) => (
                  <tr key={c.rank}>
                    <td>
                      <span
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: "800",
                          background: c.rank === 1 ? "#fff0f4" : "#f1f5f9",
                          color: c.rank === 1 ? "#de5d7c" : "#64748b",
                        }}
                      >
                        {c.rank}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: "700", color: "#1e293b" }}>{c.name}</span>
                    </td>
                    <td>
                      <span className="badge-pill pink" style={{ fontSize: "11px" }}>{c.category}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: "700" }}>{c.sales} bánh</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: "800", color: "#de5d7c" }}>{c.revenue}</span>
                    </td>
                    <td>
                      <span style={{ color: c.trend.startsWith("+") ? "#10b981" : "#ef4444", fontWeight: "700" }}>
                        {c.trend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}

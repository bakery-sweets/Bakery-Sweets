import AdminHeader from "../components/AdminHeader";
import { Link } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  return (
    <>
      <AdminHeader />

      <div className="admin-page-container">
        {/* Page Title & Main Action Buttons */}
        <div className="admin-page-header-row">
          <div className="admin-page-title-group">
            <h1>Tổng Quan Kinh Doanh</h1>
            <p>Xin chào Lê Thu Thảo! Dưới đây là tổng hợp tình hình hoạt động tiệm hôm nay.</p>
          </div>

          <div className="admin-page-actions">
            <button className="btn-pill-outline" type="button">
              <ion-icon name="cloud-upload-outline"></ion-icon>
              <span>Xuất Dữ Liệu</span>
            </button>
            <Link to="/admin/products/add" className="btn-pill-primary">
              <ion-icon name="add"></ion-icon>
              <span>Tạo Đơn Nhanh</span>
            </Link>
          </div>
        </div>

        {/* 1. TOP 4 KPI CARDS */}
        <div className="admin-grid-4" style={{ marginBottom: "22px" }}>
          {/* Hero Card: Doanh thu ngày */}
          <div className="dashboard-hero-card">
            <div className="kpi-card-header">
              <span className="kpi-label">TỔNG DOANH THU NGÀY</span>
              <button className="kpi-circle-arrow" aria-label="Chi tiết">↗</button>
            </div>
            <div>
              <div className="kpi-big-value">24.850.000 đ</div>
              <div className="kpi-footer-row">
                <span className="hero-pill-badge">
                  <span>↑ +18.2% so với hôm qua</span>
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Đơn bánh hoàn thành */}
          <div className="kpi-card-white">
            <div className="kpi-card-header">
              <span className="kpi-label">ĐƠN BÁNH HOÀN THÀNH</span>
              <button className="kpi-circle-arrow" aria-label="Chi tiết">↗</button>
            </div>
            <div>
              <div className="kpi-big-value">38 <span style={{ fontSize: "18px", fontWeight: "600", color: "#64748b" }}>đơn</span></div>
              <div className="kpi-footer-row" style={{ justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: "600" }}>+5 đơn đang nướng/giao</span>
                <span className="badge-pill mint">92% chỉ tiêu</span>
              </div>
            </div>
          </div>

          {/* Card 3: Tỷ lệ đặt cọc trước */}
          <div className="kpi-card-white">
            <div className="kpi-card-header">
              <span className="kpi-label">TỶ LỆ ĐẶT CỌC TRƯỚC</span>
              <button className="kpi-circle-arrow" aria-label="Chi tiết">↗</button>
            </div>
            <div>
              <div className="kpi-big-value">96.4%</div>
              <div className="kpi-footer-row">
                <span className="dot-status green"></span>
                <span style={{ color: "#64748b" }}>VietQR & Chuyển khoản tức thì</span>
              </div>
            </div>
          </div>

          {/* Card 4: Bán chạy nhất hôm nay */}
          <div className="kpi-card-white">
            <div className="kpi-card-header">
              <span className="kpi-label">BÁN CHẠY NHẤT HÔM NAY</span>
              <button className="kpi-circle-arrow" aria-label="Chi tiết">↗</button>
            </div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "#1e293b", marginTop: "8px" }}>
                Fraise Rose Mousse
              </div>
              <div style={{ fontSize: "12.5px", color: "#e11d48", fontWeight: "700", marginTop: "3px" }}>
                24 bánh đã xuất lò
              </div>
              <div className="kpi-footer-row" style={{ marginTop: "10px" }}>
                <span className="badge-pill amber" style={{ background: "#fef9ee", color: "#d97706" }}>
                  Còn 6 phần trong ngày
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. MIDDLE 3 WIDGETS */}
        <div className="admin-grid-3" style={{ marginBottom: "22px" }}>
          {/* Widget 1: Nhịp độ doanh thu theo khung giờ (Biểu đồ Cột kết hợp Line) */}
          <div className="admin-card-box" style={{ margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="admin-card-box-header" style={{ marginBottom: "12px" }}>
              <div className="card-title-group">
                <h3>Nhịp Độ Doanh Thu Theo Khung Giờ</h3>
                <p>Thời điểm khách thưởng thức &amp; nhận bánh</p>
              </div>
            </div>

            {/* Biểu đồ Cột kết hợp Đường Line (Combo Bar + Line Chart) */}
            <div style={{ width: "100%", padding: "6px 4px 10px" }}>
              <svg viewBox="0 0 360 165" style={{ width: "100%", height: "auto", overflow: "visible" }}>
                <defs>
                  {/* Vùng diện tích mờ phủ dưới đường Line */}
                  <linearGradient id="comboLineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#de5d7c" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#de5d7c" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Gradient cho các cột chuẩn */}
                  <linearGradient id="comboBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f8bbd0" />
                    <stop offset="100%" stopColor="#fce4ec" />
                  </linearGradient>

                  {/* Gradient cho cột 14h-16h */}
                  <linearGradient id="comboBarPeakGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f06a8c" />
                    <stop offset="100%" stopColor="#fce4ec" />
                  </linearGradient>
                </defs>

                {/* Đường lưới ngang mờ nhẹ */}
                <line x1="15" y1="35" x2="345" y2="35" stroke="#f1f2f4" strokeDasharray="3 3" />
                <line x1="15" y1="80" x2="345" y2="80" stroke="#f1f2f4" strokeDasharray="3 3" />
                <line x1="15" y1="125" x2="345" y2="125" stroke="#f1f2f4" strokeDasharray="3 3" />

                {/* 1. CÁC CỘT (BARS) BO TRÒN TRANG NHÃ */}
                <rect x="18" y="80" width="24" height="45" rx="8" fill="url(#comboBarGrad)" />
                <rect x="78" y="50" width="24" height="75" rx="8" fill="url(#comboBarGrad)" />
                <rect x="138" y="17" width="24" height="108" rx="8" fill="url(#comboBarPeakGrad)" />
                <rect x="198" y="47" width="24" height="78" rx="8" fill="url(#comboBarGrad)" />
                <rect x="258" y="65" width="24" height="60" rx="8" fill="url(#comboBarGrad)" />
                <rect x="318" y="89" width="24" height="36" rx="8" fill="url(#comboBarGrad)" />

                {/* 2. VÙNG DIỆN TÍCH DƯỚI LINE (AREA SHADOW) */}
                <path
                  d="M 30 80
                     C 60 76, 68 50, 90 50
                     C 112 50, 126 17, 150 17
                     C 174 17, 186 47, 210 47
                     C 234 47, 246 65, 270 65
                     C 294 65, 308 89, 330 89
                     L 330 125 L 30 125 Z"
                  fill="url(#comboLineAreaGrad)"
                />

                {/* 3. ĐƯỜNG LINE CHART CONG MƯỢT MÀ */}
                <path
                  d="M 30 80
                     C 60 76, 68 50, 90 50
                     C 112 50, 126 17, 150 17
                     C 174 17, 186 47, 210 47
                     C 234 47, 246 65, 270 65
                     C 294 65, 308 89, 330 89"
                  fill="none"
                  stroke="#de5d7c"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 3px 6px rgba(222, 93, 124, 0.35))" }}
                />

                {/* 4. CÁC NÚT ĐIỂM (DATA POINT DOTS) */}
                <circle cx="30" cy="80" r="4.5" fill="#ffffff" stroke="#de5d7c" strokeWidth="2.5" />
                <circle cx="90" cy="50" r="4.5" fill="#ffffff" stroke="#de5d7c" strokeWidth="2.5" />
                <circle cx="150" cy="17" r="5.5" fill="#ffffff" stroke="#de5d7c" strokeWidth="3" />
                <circle cx="210" cy="47" r="4.5" fill="#ffffff" stroke="#de5d7c" strokeWidth="2.5" />
                <circle cx="270" cy="65" r="4.5" fill="#ffffff" stroke="#de5d7c" strokeWidth="2.5" />
                <circle cx="330" cy="89" r="4.5" fill="#ffffff" stroke="#de5d7c" strokeWidth="2.5" />

                {/* 5. NHÃN TRỤC HOÀNH (X-AXIS LABELS) */}
                <text x="30" y="150" textAnchor="middle" fill="#8c9ba5" fontSize="11" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">09h</text>
                <text x="90" y="150" textAnchor="middle" fill="#8c9ba5" fontSize="11" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">11h</text>
                <text x="150" y="150" textAnchor="middle" fill="#de5d7c" fontSize="11.5" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif">14h-16h</text>
                <text x="210" y="150" textAnchor="middle" fill="#8c9ba5" fontSize="11" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">17h</text>
                <text x="270" y="150" textAnchor="middle" fill="#8c9ba5" fontSize="11" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">19h</text>
                <text x="330" y="150" textAnchor="middle" fill="#8c9ba5" fontSize="11" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">21h</text>
              </svg>
            </div>
          </div>

          {/* Widget 2: Bánh sinh nhật & Sự kiện cần giao */}
          <div className="admin-card-box" style={{ margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="admin-card-box-header">
                <div className="card-title-group">
                  <h3>Bánh Sinh Nhật & Sự Kiện Cần Giao</h3>
                  <p>Lịch xuất xưởng chiều nay</p>
                </div>
                <span className="badge-pill pink">3 đơn gấp</span>
              </div>

              <div className="event-order-list">
                <div className="event-order-item">
                  <div className="event-item-left">
                    <div className="event-icon-box peach">
                      <ion-icon name="gift-outline"></ion-icon>
                    </div>
                    <div className="event-item-meta">
                      <span className="event-item-title">Gateau Rose Framboise (16cm)</span>
                      <span className="event-item-desc">Chị Hoàng Yến • 14:30 lấy tại Tràng Tiền</span>
                    </div>
                  </div>
                  <span className="badge-pill amber" style={{ fontSize: "11px" }}>Đang decor</span>
                </div>

                <div className="event-order-item">
                  <div className="event-item-left">
                    <div className="event-icon-box mint">
                      <ion-icon name="leaf-outline"></ion-icon>
                    </div>
                    <div className="event-item-meta">
                      <span className="event-item-title">Pistachio Opera Luxury Box</span>
                      <span className="event-item-desc">Anh Minh Trí • 16:00 Ship Hoàn Kiếm</span>
                    </div>
                  </div>
                  <span className="badge-pill mint" style={{ fontSize: "11px" }}>Sẵn sàng</span>
                </div>

                <div className="event-order-item">
                  <div className="event-item-left">
                    <div className="event-icon-box purple">
                      <ion-icon name="wine-outline"></ion-icon>
                    </div>
                    <div className="event-item-meta">
                      <span className="event-item-title">Vanilla Tartlet Set (20 pcs)</span>
                      <span className="event-item-desc">Cty Helios • 17:30 Sự kiện VIP</span>
                    </div>
                  </div>
                  <span className="badge-pill cyan" style={{ fontSize: "11px" }}>Đang nướng</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "center", paddingTop: "14px", marginTop: "10px", borderTop: "1px solid #f8f9fa" }}>
              <Link to="/admin/orders" style={{ color: "#de5d7c", fontWeight: "700", fontSize: "12.5px", textDecoration: "none" }}>
                Xem toàn bộ lịch đặt tiệc &rarr;
              </Link>
            </div>
          </div>

          {/* Widget 3: Tiến độ bếp & Năng suất */}
          <div className="admin-card-box" style={{ margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="admin-card-box-header">
                <div className="card-title-group">
                  <h3>Tiến Độ Bếp & Năng Suất</h3>
                  <p>Ca nướng bánh buổi sáng & chiều</p>
                </div>
              </div>

              {/* Gauge half circle SVG */}
              <div className="kitchen-capacity-wrap">
                <div className="capacity-arc-box">
                  <svg width="170" height="90" viewBox="0 0 170 90">
                    <path
                      d="M 15 85 A 70 70 0 0 1 155 85"
                      fill="none"
                      stroke="#fce4ec"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 15 85 A 70 70 0 0 1 138 38"
                      fill="none"
                      stroke="url(#pinkArcGrad)"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="pinkArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f06a8c" />
                        <stop offset="100%" stopColor="#de5d7c" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="capacity-center-text">
                    <div className="capacity-percent">82%</div>
                    <div className="capacity-desc">Công suất bếp</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="kitchen-stats-trio">
              <div className="kitchen-stat-mini">
                <div className="stat-mini-num" style={{ color: "#10b981" }}>42</div>
                <div className="stat-mini-label">Đã nướng</div>
              </div>
              <div className="kitchen-stat-mini">
                <div className="stat-mini-num" style={{ color: "#de5d7c" }}>8</div>
                <div className="stat-mini-label">Trang trí</div>
              </div>
              <div className="kitchen-stat-mini">
                <div className="stat-mini-num" style={{ color: "#f59e0b" }}>4</div>
                <div className="stat-mini-label">Chờ ra tủ</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. BOTTOM ROW: LIVE ORDERS & INVENTORY ALERT */}
        <div className="admin-grid-split">
          {/* Left: Đơn hàng gần nhất (Live Orders) */}
          <div className="admin-card-box" style={{ margin: 0 }}>
            <div className="admin-card-box-header">
              <div className="card-title-group">
                <h3>Đơn Hàng Gần Nhất (Live Orders)</h3>
                <p>Cập nhật thời gian thực từ Quầy & Website</p>
              </div>
              <button className="badge-pill pink" style={{ border: "none", cursor: "pointer" }}>
                Làm Mới (Live)
              </button>
            </div>

            <div className="admin-table-clean-wrapper">
              <table className="admin-table-clean">
                <thead>
                  <tr>
                    <th>MÃ ĐƠN</th>
                    <th>KHÁCH HÀNG</th>
                    <th>SẢN PHẨM CHI TIẾT</th>
                    <th>TỔNG TIỀN</th>
                    <th>THANH TOÁN</th>
                    <th>TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: "700", color: "#de5d7c" }}>#ORD-9821</td>
                    <td style={{ fontWeight: "700" }}>Nguyễn Bảo Ngọc</td>
                    <td style={{ color: "#64748b", fontSize: "12.5px" }}>01 Framboise Entremet, 02 Macaron Box</td>
                    <td style={{ fontWeight: "700" }}>890.000 đ</td>
                    <td>
                      <span className="badge-pill mint" style={{ fontSize: "11px" }}>VietQR Đã Cọc</span>
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "700", color: "#10b981" }}>
                        <span className="dot-status green"></span> Đã giao
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ fontWeight: "700", color: "#de5d7c" }}>#ORD-9820</td>
                    <td style={{ fontWeight: "700" }}>Trần Đình Khang</td>
                    <td style={{ color: "#64748b", fontSize: "12.5px" }}>01 Saint-Honoré Caramel (20cm)</td>
                    <td style={{ fontWeight: "700" }}>1.250.000 đ</td>
                    <td>
                      <span className="badge-pill cyan" style={{ fontSize: "11px" }}>Thẻ Tín Dụng</span>
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "700", color: "#f59e0b" }}>
                        <span className="dot-status orange"></span> Đang đóng gói
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ fontWeight: "700", color: "#de5d7c" }}>#ORD-9819</td>
                    <td style={{ fontWeight: "700" }}>Phạm Mai Chi</td>
                    <td style={{ color: "#64748b", fontSize: "12.5px" }}>04 Croissant Pure Butter, 02 Café Rose</td>
                    <td style={{ fontWeight: "700" }}>320.000 đ</td>
                    <td>
                      <span className="badge-pill gray" style={{ fontSize: "11px" }}>Tiền Mặt</span>
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "700", color: "#10b981" }}>
                        <span className="dot-status green"></span> Hoàn tất
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Nguyên liệu cao cấp & Cảnh báo tồn */}
          <div className="admin-card-box" style={{ margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="admin-card-box-header">
                <div className="card-title-group">
                  <h3>Nguyên Liệu Cao Cấp</h3>
                  <p>Mức dự trữ nhập khẩu AOP & Hương liệu Pháp</p>
                </div>
                <span className="badge-pill pink" style={{ fontWeight: "800" }}>Cảnh Báo Tồn</span>
              </div>

              <div className="inventory-list">
                <div className="inventory-item">
                  <div className="inventory-header">
                    <span>Bơ Pháp Elle &amp; Vire AOP</span>
                    <span style={{ color: "#10b981" }}>85% (34 kg)</span>
                  </div>
                  <div className="inventory-bar-track">
                    <div className="inventory-bar-fill" style={{ width: "85%", background: "#10b981" }}></div>
                  </div>
                </div>

                <div className="inventory-item">
                  <div className="inventory-header">
                    <span>Mâm Xôi Tươi Brittany</span>
                    <span style={{ color: "#ef4444" }}>15% (Cần nhập)</span>
                  </div>
                  <div className="inventory-bar-track">
                    <div className="inventory-bar-fill" style={{ width: "15%", background: "#ef4444" }}></div>
                  </div>
                </div>

                <div className="inventory-item">
                  <div className="inventory-header">
                    <span>Chiết Xuất Hoa Hồng Grasse</span>
                    <span style={{ color: "#de5d7c" }}>60% (1.8 Lít)</span>
                  </div>
                  <div className="inventory-bar-track">
                    <div className="inventory-bar-fill" style={{ width: "60%", background: "#de5d7c" }}></div>
                  </div>
                </div>
              </div>
            </div>

            <button className="btn-pill-outline" style={{ width: "100%", justifyContent: "center" }} type="button">
              <ion-icon name="add"></ion-icon>
              <span>Tạo Phiếu Đề Xuất Nhập Kho</span>
            </button>
          </div>
        </div>

      </div>
    </>
  );
}

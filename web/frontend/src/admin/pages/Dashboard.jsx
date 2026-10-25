import { useCallback, useEffect, useMemo, useState } from "react";
import AdminHeader from "../components/AdminHeader";
import { Link } from "react-router-dom";
import useAdminAuthStore from "../../store/adminAuthStore";
import { adminDashboardApi, adminOrdersApi, adminProductsApi } from "../../api/admin";
import { formatVND, formatDateTime, apiErrorMessage, ORDER_STATUS, PAYMENT_METHOD } from "../../utils/format";
import "./Dashboard.css";

const ACTIVE_STATUSES = ["Pending", "Processing", "Ready"];
const EVENT_ICONS = [
  { box: "peach", icon: "gift-outline" },
  { box: "mint", icon: "leaf-outline" },
  { box: "purple", icon: "wine-outline" },
];

const productStock = (p) => p.sizes.reduce((s, sz) => s + sz.stock_quantity, 0);

export default function Dashboard() {
  const { user } = useAdminAuthStore();
  const [overview, setOverview] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [ov, ord, prod] = await Promise.all([
        adminDashboardApi.getOverview(),
        adminOrdersApi.getAll(),
        adminProductsApi.getAll(),
      ]);
      setOverview(ov.data);
      setOrders(ord.data);
      setProducts(prod.data);
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "Không tải được dữ liệu tổng quan"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== "Cancelled");
    const completedCount = orders.filter((o) => o.status === "Completed").length;
    const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
    const paidCount = validOrders.filter((o) => o.payment_status === "Paid").length;
    const paidRate = validOrders.length ? (paidCount / validOrders.length) * 100 : 0;

    const soldByProduct = {};
    validOrders.forEach((o) =>
      o.details.forEach((d) => {
        soldByProduct[d.product_id] = soldByProduct[d.product_id] || { name: d.product_name, qty: 0 };
        soldByProduct[d.product_id].qty += d.quantity;
      })
    );
    const topEntry = Object.entries(soldByProduct).sort((a, b) => b[1].qty - a[1].qty)[0];
    let topProduct = null;
    if (topEntry) {
      const p = products.find((x) => x.product_id === Number(topEntry[0]));
      topProduct = { ...topEntry[1], stock: p ? productStock(p) : null };
    }

    const upcoming = [...activeOrders]
      .sort((a, b) => new Date(a.pickup_time || 0) - new Date(b.pickup_time || 0))
      .slice(0, 3);
    const latest = [...orders].sort((a, b) => new Date(b.order_date) - new Date(a.order_date)).slice(0, 5);

    const maxStock = Math.max(1, ...products.map(productStock));
    const lowStock = products
      .map((p) => {
        const stock = productStock(p);
        return { id: p.product_id, name: p.product_name, stock, percent: Math.round((stock / maxStock) * 100) };
      })
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 3);

    return { completedCount, activeOrders, paidRate, topProduct, upcoming, latest, lowStock };
  }, [orders, products]);

  // 1. Dữ liệu nhịp độ theo khung giờ từ Backend API
  const hourlySlots = useMemo(() => {
    if (overview?.hourly_stats && overview.hourly_stats.length > 0) {
      return overview.hourly_stats;
    }
    return [
      { label: "09h", order_count: 0, revenue: 0, percentage: 0 },
      { label: "11h", order_count: 0, revenue: 0, percentage: 0 },
      { label: "14h-16h", order_count: 0, revenue: 0, percentage: 0 },
      { label: "17h", order_count: 0, revenue: 0, percentage: 0 },
      { label: "19h", order_count: 0, revenue: 0, percentage: 0 },
      { label: "21h", order_count: 0, revenue: 0, percentage: 0 },
    ];
  }, [overview]);

  const peakSlot = useMemo(() => {
    return hourlySlots.reduce((max, cur) => (cur.percentage > max.percentage ? cur : max), hourlySlots[0]);
  }, [hourlySlots]);

  const chartPoints = useMemo(() => {
    return hourlySlots.map((item, idx) => {
      const cx = 30 + idx * 60;
      const barHeight = Math.max(6, Math.round((item.percentage / 100) * 105));
      const cy = 125 - barHeight;
      return {
        ...item,
        cx,
        barX: cx - 12,
        barY: cy,
        barHeight,
        cy,
        isPeak: peakSlot && peakSlot.percentage > 0 && item.label === peakSlot.label,
      };
    });
  }, [hourlySlots, peakSlot]);

  const { linePath, areaPath } = useMemo(() => {
    if (!chartPoints.length) return { linePath: "", areaPath: "" };
    let d = `M ${chartPoints[0].cx} ${chartPoints[0].cy}`;
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const p0 = chartPoints[i];
      const p1 = chartPoints[i + 1];
      const cpX1 = p0.cx + 25;
      const cpY1 = p0.cy;
      const cpX2 = p1.cx - 25;
      const cpY2 = p1.cy;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.cx} ${p1.cy}`;
    }
    const area = `${d} L ${chartPoints[chartPoints.length - 1].cx} 125 L ${chartPoints[0].cx} 125 Z`;
    return { linePath: d, areaPath: area };
  }, [chartPoints]);

  // 2. Dữ liệu tiến độ nhập hàng & tồn tủ mát từ Backend API
  const kitchen = useMemo(() => {
    const k = overview?.kitchen_stats || {
      total_imported: 0,
      total_sold: 0,
      total_in_stock: 0,
      ready_rate: 0,
    };
    const rate = Math.min(100, Math.max(0, k.ready_rate || 0));
    // Tọa độ góc quét cho nửa vòng tròn R=70, tâm (85, 85)
    const endX = Number((85 - 70 * Math.cos((rate / 100) * Math.PI)).toFixed(1));
    const endY = Number((85 - 70 * Math.sin((rate / 100) * Math.PI)).toFixed(1));
    return {
      ...k,
      rate,
      endX,
      endY,
    };
  }, [overview]);

  // Xuất dữ liệu CSV
  const handleExportData = () => {
    if (!orders.length) return;
    const headers = ["Mã đơn", "Khách hàng", "Số điện thoại", "Tổng tiền", "Thanh toán", "Trạng thái", "Ngày đặt", "Giờ nhận"];
    const rows = orders.map((o) => [
      `"${o.order_code || o.order_id}"`,
      `"${(o.recipient_name || "").replace(/"/g, '""')}"`,
      `"${o.recipient_phone || ""}"`,
      o.final_cost,
      `"${o.payment_status || ""}"`,
      `"${o.status || ""}"`,
      `"${o.order_date || ""}"`,
      `"${o.pickup_time || ""}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `TheSweets_Bao_Cao_Don_Hang_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <AdminHeader />

      <div className="admin-page-container">
        {/* Page Title & Main Action Buttons */}
        <div className="admin-page-header-row">
          <div className="admin-page-title-group">
            <h1>Tổng Quan Kinh Doanh</h1>
            <p>Xin chào {user?.email || "Admin"}! Dưới đây là tổng hợp tình hình hoạt động của tiệm.</p>
          </div>

          <div className="admin-page-actions">
            <button className="btn-pill-outline" type="button" onClick={handleExportData} title="Xuất báo cáo danh sách đơn hàng sang file CSV">
              <ion-icon name="cloud-upload-outline"></ion-icon>
              <span>Xuất Dữ Liệu</span>
            </button>
            <Link to="/admin/products/add" className="btn-pill-primary">
              <ion-icon name="add"></ion-icon>
              <span>Tạo Đơn Nhanh</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="admin-card-box" style={{ color: "#b91c1c", fontWeight: "600", marginBottom: "22px" }}>
            {error}
          </div>
        )}

        {/* 1. TOP 4 KPI CARDS */}
        <div className="admin-grid-4" style={{ marginBottom: "22px" }}>
          {/* Hero Card: Tổng doanh thu */}
          <div className="dashboard-hero-card">
            <div className="kpi-card-header">
              <span className="kpi-label">TỔNG DOANH THU (ĐƠN HOÀN TẤT)</span>
              <Link to="/admin/statistical" className="kpi-circle-arrow" title="Xem báo cáo chi tiết doanh thu">
                <ion-icon name="arrow-forward-outline" style={{ transform: "rotate(-45deg)" }}></ion-icon>
              </Link>
            </div>
            <div>
              <div className="kpi-big-value">{loading ? "..." : formatVND(overview?.total_revenue, " đ")}</div>
              <div className="kpi-footer-row">
                <span className="hero-pill-badge">
                  <span>{overview?.total_orders ?? 0} đơn • {overview?.total_customers ?? 0} khách hàng</span>
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Đơn bánh hoàn thành */}
          <div className="kpi-card-white">
            <div className="kpi-card-header">
              <span className="kpi-label">ĐƠN BÁNH HOÀN THÀNH</span>
              <Link to="/admin/orders" className="kpi-circle-arrow" title="Xem danh sách đơn hàng">
                <ion-icon name="arrow-forward-outline" style={{ transform: "rotate(-45deg)" }}></ion-icon>
              </Link>
            </div>
            <div>
              <div className="kpi-big-value">{loading ? "..." : stats.completedCount} <span style={{ fontSize: "18px", fontWeight: "600", color: "#64748b" }}>đơn</span></div>
              <div className="kpi-footer-row" style={{ justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: "600" }}>+{stats.activeOrders.length} đơn đang chuẩn bị &amp; chờ nhận</span>
                <span className="badge-pill mint">{overview?.total_orders ?? 0} tổng đơn</span>
              </div>
            </div>
          </div>

          {/* Card 3: Tỷ lệ đã thanh toán */}
          <div className="kpi-card-white">
            <div className="kpi-card-header">
              <span className="kpi-label">TỶ LỆ ĐÃ THANH TOÁN</span>
              <Link to="/admin/orders" className="kpi-circle-arrow" title="Xem trạng thái thanh toán đơn hàng">
                <ion-icon name="arrow-forward-outline" style={{ transform: "rotate(-45deg)" }}></ion-icon>
              </Link>
            </div>
            <div>
              <div className="kpi-big-value">{loading ? "..." : `${stats.paidRate.toFixed(1)}%`}</div>
              <div className="kpi-footer-row">
                <span className="dot-status green"></span>
                <span style={{ color: "#64748b" }}>Đơn có trạng thái Paid</span>
              </div>
            </div>
          </div>

          {/* Card 4: Bán chạy nhất */}
          <div className="kpi-card-white">
            <div className="kpi-card-header">
              <span className="kpi-label">BÁN CHẠY NHẤT</span>
              <Link to="/admin/products" className="kpi-circle-arrow" title="Xem danh sách sản phẩm">
                <ion-icon name="arrow-forward-outline" style={{ transform: "rotate(-45deg)" }}></ion-icon>
              </Link>
            </div>
            {stats.topProduct ? (
              <div>
                <div style={{ fontSize: "17px", fontWeight: "800", color: "#1e293b", marginTop: "8px" }}>
                  {stats.topProduct.name}
                </div>
                <div style={{ fontSize: "12.5px", color: "#e11d48", fontWeight: "700", marginTop: "3px" }}>
                  {stats.topProduct.qty} bánh đã bán ra
                </div>
                {stats.topProduct.stock !== null && (
                  <div className="kpi-footer-row" style={{ marginTop: "10px" }}>
                    <span className="badge-pill amber" style={{ background: "#fef9ee", color: "#d97706" }}>
                      Còn {stats.topProduct.stock} phần
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "13px", color: "#8c9ba5", fontWeight: "600", marginTop: "8px" }}>
                {loading ? "Đang tải..." : "Chưa có dữ liệu"}
              </div>
            )}
          </div>
        </div>

        {/* 2. MIDDLE 3 WIDGETS */}
        <div className="admin-grid-3" style={{ marginBottom: "22px" }}>
          {/* Widget 1: Nhịp độ doanh thu theo khung giờ (Biểu đồ Cột kết hợp Line động) */}
          <div className="admin-card-box" style={{ margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="admin-card-box-header" style={{ marginBottom: "12px" }}>
              <div className="card-title-group">
                <h3>Nhịp Độ Doanh Thu Theo Khung Giờ</h3>
                <p>Thời điểm khách thưởng thức &amp; nhận bánh</p>
              </div>
              {peakSlot && peakSlot.order_count > 0 && (
                <span className="badge-pill pink" title={`Doanh thu: ${formatVND(peakSlot.revenue, " đ")}`}>
                  Cao điểm: {peakSlot.label} ({peakSlot.order_count} đơn)
                </span>
              )}
            </div>

            {/* Biểu đồ Cột kết hợp Đường Line (Combo Bar + Line Chart) tự động theo DB */}
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

                  {/* Gradient cho cột cao điểm */}
                  <linearGradient id="comboBarPeakGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f06a8c" />
                    <stop offset="100%" stopColor="#fce4ec" />
                  </linearGradient>
                </defs>

                {/* Đường lưới ngang mờ nhẹ */}
                <line x1="15" y1="35" x2="345" y2="35" stroke="#f1f2f4" strokeDasharray="3 3" />
                <line x1="15" y1="80" x2="345" y2="80" stroke="#f1f2f4" strokeDasharray="3 3" />
                <line x1="15" y1="125" x2="345" y2="125" stroke="#f1f2f4" strokeDasharray="3 3" />

                {/* 1. CÁC CỘT (BARS) TÍNH TOÁN THEO SỐ LIỆU ĐỘNG */}
                {chartPoints.map((pt) => (
                  <rect
                    key={`bar-${pt.label}`}
                    x={pt.barX}
                    y={pt.barY}
                    width="24"
                    height={pt.barHeight}
                    rx="8"
                    fill={pt.isPeak ? "url(#comboBarPeakGrad)" : "url(#comboBarGrad)"}
                  >
                    <title>{`${pt.label}: ${pt.order_count} đơn hàng • ${formatVND(pt.revenue, " đ")}`}</title>
                  </rect>
                ))}

                {/* 2. VÙNG DIỆN TÍCH DƯỚI LINE (AREA SHADOW) */}
                {areaPath && <path d={areaPath} fill="url(#comboLineAreaGrad)" />}

                {/* 3. ĐƯỜNG LINE CHART CONG MƯỢT MÀ */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#de5d7c"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    style={{ filter: "drop-shadow(0 3px 6px rgba(222, 93, 124, 0.35))" }}
                  />
                )}

                {/* 4. CÁC NÚT ĐIỂM (DATA POINT DOTS) */}
                {chartPoints.map((pt) => (
                  <circle
                    key={`dot-${pt.label}`}
                    cx={pt.cx}
                    cy={pt.cy}
                    r={pt.isPeak ? "5.5" : "4.5"}
                    fill="#ffffff"
                    stroke="#de5d7c"
                    strokeWidth={pt.isPeak ? "3" : "2.5"}
                  >
                    <title>{`${pt.label}: ${pt.order_count} đơn hàng • ${formatVND(pt.revenue, " đ")}`}</title>
                  </circle>
                ))}

                {/* 5. NHÃN TRỤC HOÀNH (X-AXIS LABELS) */}
                {chartPoints.map((pt) => (
                  <text
                    key={`label-${pt.label}`}
                    x={pt.cx}
                    y="150"
                    textAnchor="middle"
                    fill={pt.isPeak ? "#de5d7c" : "#8c9ba5"}
                    fontSize={pt.isPeak ? "11.5" : "11"}
                    fontWeight={pt.isPeak ? "800" : "600"}
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    {pt.label}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          {/* Widget 2: Đơn hàng & Lịch nhận bánh sắp tới */}
          <div className="admin-card-box" style={{ margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="admin-card-box-header">
                <div className="card-title-group">
                  <h3>Đơn Hàng &amp; Hẹn Nhận Bánh</h3>
                  <p>Lịch nhận bánh tại quầy sắp tới</p>
                </div>
                <span className="badge-pill pink">{stats.activeOrders.length} đơn chờ nhận</span>
              </div>

              <div className="event-order-list">
                {stats.upcoming.length === 0 && (
                  <div style={{ fontSize: "12.5px", color: "#8c9ba5", padding: "12px 0" }}>
                    {loading ? "Đang tải..." : "Không có đơn nào đang chờ nhận."}
                  </div>
                )}
                {stats.upcoming.map((o, idx) => {
                  const ic = EVENT_ICONS[idx % EVENT_ICONS.length];
                  const st = ORDER_STATUS[o.status] || {};
                  const first = o.details[0];
                  return (
                    <div className="event-order-item" key={o.order_id}>
                      <div className="event-item-left">
                        <div className={`event-icon-box ${ic.box}`}>
                          <ion-icon name={ic.icon}></ion-icon>
                        </div>
                        <div className="event-item-meta">
                          <span className="event-item-title">
                            {first ? first.product_name : `#${o.order_code}`}
                            {o.details.length > 1 ? ` & ${o.details.length - 1} món khác` : ""}
                          </span>
                          <span className="event-item-desc">{o.recipient_name} • {formatDateTime(o.pickup_time)}</span>
                        </div>
                      </div>
                      <span className={`badge-pill ${st.badge}`} style={{ fontSize: "11px" }}>{st.label || o.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ textAlign: "center", paddingTop: "14px", marginTop: "10px", borderTop: "1px solid #f8f9fa" }}>
              <Link to="/admin/orders" style={{ color: "#de5d7c", fontWeight: "700", fontSize: "12.5px", textDecoration: "none" }}>
                Xem toàn bộ đơn hàng &rarr;
              </Link>
            </div>
          </div>

          {/* Widget 3: Tiến độ nhập hàng & Sẵn sàng bán tại tủ (Động theo CSDL) */}
          <div className="admin-card-box" style={{ margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="admin-card-box-header">
                <div className="card-title-group">
                  <h3>Tiến Độ Nhập Hàng &amp; Tồn Tủ Mát</h3>
                  <p>Tỷ lệ bánh tươi sẵn sàng phục vụ hôm nay</p>
                </div>
              </div>

              {/* Gauge half circle SVG tự động tính toán theo kitchen.rate */}
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
                    {kitchen.rate > 0 && (
                      <path
                        d={`M 15 85 A 70 70 0 0 1 ${kitchen.endX} ${kitchen.endY}`}
                        fill="none"
                        stroke="url(#pinkArcGrad)"
                        strokeWidth="12"
                        strokeLinecap="round"
                      />
                    )}
                    <defs>
                      <linearGradient id="pinkArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f06a8c" />
                        <stop offset="100%" stopColor="#de5d7c" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="capacity-center-text">
                    <div className="capacity-percent">{loading ? "..." : `${kitchen.rate}%`}</div>
                    <div className="capacity-desc">Tủ mát sẵn sàng</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="kitchen-stats-trio">
              <div className="kitchen-stat-mini">
                <div className="stat-mini-num" style={{ color: "#10b981" }}>{loading ? "..." : kitchen.total_imported}</div>
                <div className="stat-mini-label">Đã nhập</div>
              </div>
              <div className="kitchen-stat-mini">
                <div className="stat-mini-num" style={{ color: "#de5d7c" }}>{loading ? "..." : kitchen.total_sold}</div>
                <div className="stat-mini-label">Đã bán</div>
              </div>
              <div className="kitchen-stat-mini">
                <div className="stat-mini-num" style={{ color: "#f59e0b" }}>{loading ? "..." : kitchen.total_in_stock}</div>
                <div className="stat-mini-label">Còn trong tủ</div>
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
              <button className="badge-pill pink" style={{ border: "none", cursor: "pointer" }} onClick={() => { setLoading(true); loadData(); }}>
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
                  {stats.latest.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", color: "#8c9ba5" }}>
                        {loading ? "Đang tải..." : "Chưa có đơn hàng nào."}
                      </td>
                    </tr>
                  )}
                  {stats.latest.map((o) => {
                    const st = ORDER_STATUS[o.status] || {};
                    return (
                      <tr key={o.order_id}>
                        <td style={{ fontWeight: "700", color: "#de5d7c" }}>#{o.order_code}</td>
                        <td style={{ fontWeight: "700" }}>{o.recipient_name}</td>
                        <td style={{ color: "#64748b", fontSize: "12.5px" }}>
                          {o.details.map((d) => `${String(d.quantity).padStart(2, "0")} ${d.product_name}`).join(", ")}
                        </td>
                        <td style={{ fontWeight: "700" }}>{formatVND(o.final_cost, " đ")}</td>
                        <td>
                          <span className={`badge-pill ${o.payment_status === "Paid" ? "mint" : "gray"}`} style={{ fontSize: "11px" }}>
                            {PAYMENT_METHOD[o.payment_method] || o.payment_method}
                          </span>
                        </td>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "700" }}>
                            <span className={`dot-status ${st.dot}`}></span> {st.label || o.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Cảnh báo tồn kho bánh bán lẻ */}
          <div className="admin-card-box" style={{ margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="admin-card-box-header">
                <div className="card-title-group">
                  <h3>Cảnh Báo Tồn Kho Bánh</h3>
                  <p>Mức tồn bánh thành phẩm trong tủ bảo quản</p>
                </div>
                <span className="badge-pill pink" style={{ fontWeight: "800" }}>Cảnh Báo Tồn</span>
              </div>

              <div className="inventory-list">
                {stats.lowStock.length === 0 && (
                  <div style={{ fontSize: "12.5px", color: "#8c9ba5" }}>{loading ? "Đang tải..." : "Chưa có sản phẩm."}</div>
                )}
                {stats.lowStock.map((p) => {
                  const color = p.percent <= 20 ? "#ef4444" : p.percent <= 50 ? "#de5d7c" : "#10b981";
                  return (
                    <div className="inventory-item" key={p.id}>
                      <div className="inventory-header">
                        <span>{p.name}</span>
                        <span style={{ color }}>
                          {p.percent}% (Còn {p.stock}{p.percent <= 20 ? " - Cần nhập" : ""})
                        </span>
                      </div>
                      <div className="inventory-bar-track">
                        <div className="inventory-bar-fill" style={{ width: `${p.percent}%`, background: color }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Link
              to="/admin/import-receipts"
              className="btn-pill-outline"
              style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}
            >
              <ion-icon name="add"></ion-icon>
              <span>Tạo Phiếu Nhập Hàng Từ Nhà Cung Cấp</span>
            </Link>
          </div>
        </div>

      </div>
    </>
  );
}

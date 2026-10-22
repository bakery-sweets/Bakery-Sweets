import { useEffect, useMemo, useState } from "react";
import AdminHeader from "../components/AdminHeader";
import { adminOrdersApi, adminProductsApi } from "../../api/admin";
import { formatVND, formatDate, apiErrorMessage } from "../../utils/format";

const DAY_LABELS = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const CATEGORY_COLORS = ["#de5d7c", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const startOfPeriod = (key, now) => {
  const d = startOfDay(now);
  if (key === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  if (key === "month") d.setDate(1);
  if (key === "quarter") d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
  if (key === "year") d.setMonth(0, 1);
  return d;
};

const shortMoney = (v) => {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}K`;
  return String(v);
};

export default function Statistical() {
  const [activePeriod, setActivePeriod] = useState("week");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const now = useMemo(() => new Date(), []);

  const periods = [
    { key: "today", label: "Hôm Nay" },
    { key: "week", label: "Tuần Này" },
    { key: "month", label: "Tháng Này" },
    { key: "quarter", label: "Quý Này" },
    { key: "year", label: `Năm ${now.getFullYear()}` },
  ];
  const periodLabel = periods.find((p) => p.key === activePeriod)?.label || "";

  useEffect(() => {
    Promise.all([adminOrdersApi.getAll(), adminProductsApi.getAll()])
      .then(([ord, prod]) => {
        setOrders(ord.data);
        setProducts(prod.data);
      })
      .catch((err) => setError(apiErrorMessage(err, "Không tải được dữ liệu báo cáo")))
      .finally(() => setLoading(false));
  }, []);

  // Doanh thu chỉ tính đơn Completed (giống định nghĩa của /admin/dashboard/overview)
  const completedOrders = useMemo(() => orders.filter((o) => o.status === "Completed"), [orders]);

  const report = useMemo(() => {
    const periodStart = startOfPeriod(activePeriod, now);
    const inPeriod = completedOrders.filter((o) => new Date(o.order_date) >= periodStart);
    const revenue = inPeriod.reduce((s, o) => s + Number(o.final_cost), 0);
    const itemsSold = inPeriod.reduce((s, o) => s + o.total_quantity, 0);

    const categoryOf = {};
    products.forEach((p) => { categoryOf[p.product_id] = p.category_name || "Khác"; });

    const byCategory = {};
    const byProduct = {};
    inPeriod.forEach((o) =>
      o.details.forEach((d) => {
        const lineTotal = Number(d.total_price);
        const cat = categoryOf[d.product_id] || "Khác";
        byCategory[cat] = (byCategory[cat] || 0) + lineTotal;
        byProduct[d.product_id] = byProduct[d.product_id] || { name: d.product_name, category: cat, sales: 0, revenue: 0 };
        byProduct[d.product_id].sales += d.quantity;
        byProduct[d.product_id].revenue += lineTotal;
      })
    );
    const categoryTotal = Object.values(byCategory).reduce((s, v) => s + v, 0);
    const categoryShare = Object.entries(byCategory)
      .map(([name, value]) => ({ name, value, percent: categoryTotal ? Math.round((value / categoryTotal) * 100) : 0 }))
      .sort((a, b) => b.value - a.value);

    const topProducts = Object.values(byProduct)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)
      .map((p, idx) => ({ ...p, rank: idx + 1 }));

    return { periodStart, count: inPeriod.length, revenue, itemsSold, categoryShare, topProducts };
  }, [activePeriod, completedOrders, products, now]);

  // Biểu đồ 7 ngày gần nhất (tính đến hôm nay), không phụ thuộc bộ lọc kỳ
  const last7Days = useMemo(() => {
    const today = startOfDay(now);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return { date: d, rev: 0 };
    });
    completedOrders.forEach((o) => {
      const od = startOfDay(new Date(o.order_date)).getTime();
      const slot = days.find((d) => d.date.getTime() === od);
      if (slot) slot.rev += Number(o.final_cost);
    });
    const max = Math.max(...days.map((d) => d.rev));
    return days.map((d) => ({
      day: DAY_LABELS[d.date.getDay()],
      rev: d.rev,
      h: max ? Math.max(4, Math.round((d.rev / max) * 100)) : 4,
      isPeak: max > 0 && d.rev === max,
    }));
  }, [completedOrders, now]);
  const peakDay = last7Days.find((d) => d.isPeak);

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
              <span>{formatDate(report.periodStart)} - {formatDate(now)}</span>
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

        {error && (
          <div className="admin-card-box" style={{ color: "#b91c1c", fontWeight: "600" }}>
            {error}
          </div>
        )}

        {/* 3 Metric Cards */}
        <div className="admin-grid-3" style={{ marginBottom: "22px" }}>
          <div className="dashboard-hero-card" style={{ minHeight: "160px" }}>
            <div className="kpi-card-header">
              <span className="kpi-label">DOANH THU {periodLabel.toUpperCase()}</span>
              <button className="kpi-circle-arrow" aria-label="Chi tiết"><ion-icon name="arrow-forward-outline" style={{ transform: "rotate(-45deg)" }}></ion-icon></button>
            </div>
            <div>
              <div className="kpi-big-value">{loading ? "..." : formatVND(report.revenue, " đ")}</div>
              <div className="kpi-footer-row">
                <span className="hero-pill-badge">{report.count} đơn hoàn tất</span>
              </div>
            </div>
          </div>

          <div className="kpi-card-white" style={{ minHeight: "160px" }}>
            <div className="kpi-card-header">
              <span className="kpi-label">TỔNG BÁNH BÁN RA</span>
              <button className="kpi-circle-arrow" aria-label="Chi tiết"><ion-icon name="arrow-forward-outline" style={{ transform: "rotate(-45deg)" }}></ion-icon></button>
            </div>
            <div>
              <div className="kpi-big-value">{loading ? "..." : report.itemsSold.toLocaleString("vi-VN")} <span style={{ fontSize: "18px", color: "#64748b" }}>bánh</span></div>
              <div className="kpi-footer-row">
                <span className="badge-pill mint">{report.count} đơn</span>
              </div>
            </div>
          </div>

          <div className="kpi-card-white" style={{ minHeight: "160px" }}>
            <div className="kpi-card-header">
              <span className="kpi-label">LỢI NHUẬN GỘP ƯỚC TÍNH</span>
              <button className="kpi-circle-arrow" aria-label="Chi tiết"><ion-icon name="arrow-forward-outline" style={{ transform: "rotate(-45deg)" }}></ion-icon></button>
            </div>
            <div>
              <div className="kpi-big-value" style={{ color: "#10b981" }}>—</div>
              <div className="kpi-footer-row">
                <span style={{ color: "#64748b" }}>Backend chưa cung cấp giá nhập</span>
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
              <span className="badge-pill pink">{peakDay ? `Cao nhất: ${peakDay.day} (${shortMoney(peakDay.rev)})` : "Chưa có doanh thu"}</span>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: "180px", padding: "20px 10px 0" }}>
              {last7Days.map((b, idx) => (
                <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", gap: "6px" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: "700", color: b.isPeak ? "#de5d7c" : "#8c9ba5" }}>
                    {shortMoney(b.rev)}
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
                {report.categoryShare.length === 0 && (
                  <div style={{ fontSize: "12.5px", color: "#8c9ba5" }}>{loading ? "Đang tải..." : "Chưa có doanh thu trong kỳ này."}</div>
                )}
                {report.categoryShare.map((c, idx) => {
                  const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  return (
                    <div key={c.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "700", marginBottom: "6px" }}>
                        <span>{c.name}</span>
                        <span style={{ color }}>{c.percent}% ({shortMoney(c.value)} đ)</span>
                      </div>
                      <div style={{ width: "100%", height: "8px", background: "#f1f2f4", borderRadius: "9999px", overflow: "hidden" }}>
                        <div style={{ width: `${c.percent}%`, height: "100%", background: color, borderRadius: "9999px" }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ background: "#fff0f4", borderRadius: "14px", padding: "12px", marginTop: "16px", fontSize: "12px", color: "#de5d7c", fontWeight: "600" }}>
              <ion-icon name="bulb-outline" style={{ verticalAlign: "-2px", marginRight: "4px" }}></ion-icon>{report.categoryShare.length
                ? `${report.categoryShare[0].name} đang đóng góp doanh thu lớn nhất trong kỳ này.`
                : "Chưa có đơn hoàn tất nào trong kỳ này."}
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
                {report.topProducts.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "#8c9ba5" }}>
                      {loading ? "Đang tải..." : "Chưa có món bánh nào được bán trong kỳ này."}
                    </td>
                  </tr>
                )}
                {report.topProducts.map((c) => (
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
                      <span style={{ fontWeight: "800", color: "#de5d7c" }}>{formatVND(c.revenue, " đ")}</span>
                    </td>
                    <td>
                      <span style={{ color: "#8c9ba5", fontWeight: "700" }}>—</span>
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

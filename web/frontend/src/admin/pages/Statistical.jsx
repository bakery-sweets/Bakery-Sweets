import { useEffect, useMemo, useState } from "react";
import AdminHeader from "../components/AdminHeader";
import { adminOrdersApi, adminProductsApi } from "../../api/admin";
import { formatVND, formatDate, toLocalDateInput, apiErrorMessage, PAYMENT_METHOD } from "../../utils/format";

const DAY_LABELS = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const CATEGORY_COLORS = ["#de5d7c", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];
const PAYMENT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#de5d7c", "#8b5cf6"];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const startOfPeriod = (key, now) => {
  const d = startOfDay(now);
  if (key === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  if (key === "month") d.setDate(1);
  if (key === "quarter") d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
  if (key === "year") d.setMonth(0, 1);
  return d;
};

// Các cột của biểu đồ theo kỳ: hôm nay theo 2 giờ, tuần/tháng theo ngày, quý/năm theo tháng
const buildBuckets = (key, start) => {
  const make = (count, step) =>
    Array.from({ length: count }, (_, i) => {
      const from = step(new Date(start), i);
      const to = step(new Date(start), i + 1);
      return { from, to };
    });

  if (key === "today") {
    return make(12, (d, i) => { d.setHours(i * 2); return d; }).map((b) => {
      const h = b.from.getHours();
      return { ...b, label: `${h}h`, fullLabel: `${h}:00 - ${h + 2}:00` };
    });
  }
  if (key === "week" || key === "month") {
    const days = key === "week" ? 7 : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    return make(days, (d, i) => { d.setDate(d.getDate() + i); return d; }).map((b) => ({
      ...b,
      label: key === "week" ? DAY_LABELS[b.from.getDay()] : String(b.from.getDate()),
      fullLabel: `${DAY_LABELS[b.from.getDay()]} ${formatDate(b.from)}`,
    }));
  }
  const months = key === "quarter" ? 3 : 12;
  return make(months, (d, i) => { d.setMonth(d.getMonth() + i); return d; }).map((b) => ({
    ...b,
    label: `T${b.from.getMonth() + 1}`,
    fullLabel: `Tháng ${b.from.getMonth() + 1}/${b.from.getFullYear()}`,
  }));
};

const summarize = (list) => {
  const revenue = list.reduce((s, o) => s + Number(o.final_cost), 0);
  const itemsSold = list.reduce((s, o) => s + o.total_quantity, 0);
  return { revenue, itemsSold, count: list.length, avg: list.length ? revenue / list.length : 0 };
};

const toShares = (map) => {
  const total = Object.values(map).reduce((s, v) => s + v, 0);
  return Object.entries(map)
    .map(([name, value]) => ({ name, value, percent: total ? Math.round((value / total) * 100) : 0 }))
    .sort((a, b) => b.value - a.value);
};

const shortMoney = (v) => {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}K`;
  return String(v);
};

function ShareBars({ items, colors, loading }) {
  if (items.length === 0) {
    return <div style={{ fontSize: "12.5px", color: "#8c9ba5" }}>{loading ? "Đang tải..." : "Chưa có doanh thu trong kỳ này."}</div>;
  }
  return items.map((c, idx) => {
    const color = colors[idx % colors.length];
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
  });
}

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
    const inRange = (o, from, to) => {
      const t = new Date(o.order_date);
      return t >= from && t < to;
    };
    const periodEnd = new Date(now.getTime() + 1);
    const inPeriod = completedOrders.filter((o) => inRange(o, periodStart, periodEnd));
    const cancelled = orders.filter((o) => o.status === "Cancelled" && inRange(o, periodStart, periodEnd)).length;

    const categoryOf = {};
    products.forEach((p) => { categoryOf[p.product_id] = p.category_name || "Khác"; });

    const byCategory = {};
    const byProduct = {};
    const byPayment = {};
    inPeriod.forEach((o) => {
      const method = PAYMENT_METHOD[o.payment_method] || o.payment_method;
      byPayment[method] = (byPayment[method] || 0) + Number(o.final_cost);
      o.details.forEach((d) => {
        const lineTotal = Number(d.total_price);
        const cat = categoryOf[d.product_id] || "Khác";
        byCategory[cat] = (byCategory[cat] || 0) + lineTotal;
        byProduct[d.product_id] = byProduct[d.product_id] || { name: d.product_name, category: cat, sales: 0, revenue: 0 };
        byProduct[d.product_id].sales += d.quantity;
        byProduct[d.product_id].revenue += lineTotal;
      });
    });

    // Tỷ trọng từng món tính trên tổng tiền bánh (trước voucher) để các món cộng lại đúng 100%
    const linesTotal = Object.values(byCategory).reduce((s, v) => s + v, 0);
    const productRanking = Object.values(byProduct)
      .sort((a, b) => b.sales - a.sales || b.revenue - a.revenue)
      .map((p, idx) => ({ ...p, rank: idx + 1, percent: linesTotal ? Math.round((p.revenue / linesTotal) * 100) : 0 }));

    const buckets = buildBuckets(activePeriod, periodStart).map((b) => ({
      ...b,
      rev: inPeriod.filter((o) => inRange(o, b.from, b.to)).reduce((s, o) => s + Number(o.final_cost), 0),
    }));
    const max = Math.max(...buckets.map((b) => b.rev));
    const chart = buckets.map((b) => ({
      ...b,
      h: max ? Math.max(4, Math.round((b.rev / max) * 100)) : 4,
      isPeak: max > 0 && b.rev === max,
    }));

    return {
      periodStart,
      ...summarize(inPeriod),
      cancelled,
      chart,
      categoryShare: toShares(byCategory),
      paymentShare: toShares(byPayment),
      productRanking,
      topProducts: productRanking.slice(0, 5),
    };
  }, [activePeriod, orders, completedOrders, products, now]);

  const peak = report.chart.find((b) => b.isPeak);
  const chartTitle = activePeriod === "today" ? "Theo Giờ" : ["week", "month"].includes(activePeriod) ? "Theo Ngày" : "Theo Tháng";
  const showBarValues = report.chart.length <= 12;

  const exportCsv = () => {
    const rows = [
      ["BÁO CÁO DOANH THU", periodLabel],
      ["Từ ngày", formatDate(report.periodStart), "Đến ngày", formatDate(now)],
      [],
      ["Chỉ số", "Giá trị"],
      ["Doanh thu (đ)", report.revenue],
      ["Số đơn hoàn tất", report.count],
      ["Số đơn bị hủy", report.cancelled],
      ["Số bánh bán ra", report.itemsSold],
      ["Giá trị trung bình / đơn (đ)", Math.round(report.avg)],
      [],
      [`Doanh thu ${chartTitle.toLowerCase()}`, "Doanh thu (đ)"],
      ...report.chart.map((b) => [b.fullLabel, b.rev]),
      [],
      ["Danh mục", "Tiền bánh (đ)", "Tỷ trọng (%)"],
      ...report.categoryShare.map((c) => [c.name, c.value, c.percent]),
      [],
      ["Phương thức thanh toán", "Doanh thu (đ)", "Tỷ trọng (%)"],
      ...report.paymentShare.map((c) => [c.name, c.value, c.percent]),
      [],
      ["Hạng", "Tên bánh", "Danh mục", "Số lượng", "Tiền bánh (đ)", "Tỷ trọng (%)"],
      ...report.productRanking.map((p) => [p.rank, p.name, p.category, p.sales, p.revenue, p.percent]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    // BOM để Excel đọc đúng tiếng Việt UTF-8
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `bao-cao-doanh-thu-${activePeriod}-${toLocalDateInput(now)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <AdminHeader />

      <div className="admin-page-container">
        {/* Header Row */}
        <div className="admin-page-header-row">
          <div className="admin-page-title-group">
            <h1>Báo Cáo Doanh Thu</h1>
            <p>Doanh thu, cơ cấu doanh số &amp; các dòng bánh bán chạy của tiệm</p>
          </div>

          <div className="admin-page-actions">
            <div className="btn-pill-outline" style={{ cursor: "default" }}>
              <ion-icon name="calendar-outline"></ion-icon>
              <span>{formatDate(report.periodStart)} - {formatDate(now)}</span>
            </div>
            <button className="btn-pill-primary" type="button" onClick={exportCsv} disabled={loading}>
              <ion-icon name="download-outline"></ion-icon>
              <span>Xuất Excel (CSV)</span>
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

        {/* 4 Metric Cards */}
        <div className="admin-grid-4" style={{ marginBottom: "22px" }}>
          <div className="dashboard-hero-card" style={{ minHeight: "150px" }}>
            <div className="kpi-card-header">
              <span className="kpi-label">DOANH THU {periodLabel.toUpperCase()}</span>
            </div>
            <div>
              <div className="kpi-big-value" style={{ fontSize: "28px" }}>{loading ? "..." : formatVND(report.revenue, " đ")}</div>
            </div>
          </div>

          <div className="kpi-card-white" style={{ minHeight: "150px" }}>
            <div className="kpi-card-header">
              <span className="kpi-label">ĐƠN HOÀN TẤT</span>
            </div>
            <div>
              <div className="kpi-big-value" style={{ fontSize: "28px" }}>{loading ? "..." : report.count.toLocaleString("vi-VN")} <span style={{ fontSize: "16px", color: "#64748b" }}>đơn</span></div>
              <div className="kpi-footer-row">
                <span style={{ color: "#64748b" }}>{report.cancelled} đơn bị hủy</span>
              </div>
            </div>
          </div>

          <div className="kpi-card-white" style={{ minHeight: "150px" }}>
            <div className="kpi-card-header">
              <span className="kpi-label">BÁNH BÁN RA</span>
            </div>
            <div>
              <div className="kpi-big-value" style={{ fontSize: "28px" }}>{loading ? "..." : report.itemsSold.toLocaleString("vi-VN")} <span style={{ fontSize: "16px", color: "#64748b" }}>bánh</span></div>
              <div className="kpi-footer-row">
                <span style={{ color: "#64748b" }}>TB {report.count ? (report.itemsSold / report.count).toFixed(1) : 0} bánh/đơn</span>
              </div>
            </div>
          </div>

          <div className="kpi-card-white" style={{ minHeight: "150px" }}>
            <div className="kpi-card-header">
              <span className="kpi-label">GIÁ TRỊ TRUNG BÌNH / ĐƠN</span>
            </div>
            <div>
              <div className="kpi-big-value" style={{ fontSize: "28px" }}>{loading ? "..." : formatVND(Math.round(report.avg), " đ")}</div>
            </div>
          </div>
        </div>

        {/* 2 Grid: Bar Chart & Category Share */}
        <div className="admin-grid-split" style={{ marginBottom: "22px" }}>
          <div className="admin-card-box" style={{ margin: 0 }}>
            <div className="admin-card-box-header">
              <div className="card-title-group">
                <h3>Doanh Thu {chartTitle}</h3>
                <p>Doanh thu từ các đơn đã hoàn tất trong {periodLabel.toLowerCase()}</p>
              </div>
              <span className="badge-pill pink">{peak ? `Cao nhất: ${peak.fullLabel} (${shortMoney(peak.rev)})` : "Chưa có doanh thu"}</span>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "180px", padding: "20px 4px 0" }}>
              {report.chart.map((b, idx) => (
                <div
                  key={idx}
                  title={`${b.fullLabel}: ${formatVND(b.rev, " đ")}`}
                  style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", gap: "6px" }}
                >
                  {showBarValues && (
                    <span style={{ fontSize: "10.5px", fontWeight: "700", color: b.isPeak ? "#de5d7c" : "#8c9ba5" }}>
                      {shortMoney(b.rev)}
                    </span>
                  )}
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "36px",
                      height: `${b.h}%`,
                      background: b.isPeak
                        ? "linear-gradient(180deg, #de5d7c 0%, #c74767 100%)"
                        : "linear-gradient(180deg, #fce4ec 0%, #f8bbd0 100%)",
                      borderRadius: showBarValues ? "12px 12px 4px 4px" : "6px 6px 2px 2px",
                      boxShadow: b.isPeak ? "0 4px 12px rgba(222, 93, 124, 0.35)" : "none",
                    }}
                  ></div>
                  <span style={{ fontSize: showBarValues ? "11px" : "9.5px", fontWeight: "700", color: b.isPeak ? "#de5d7c" : "#64748b" }}>
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-card-box" style={{ margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="admin-card-box-header">
                <div className="card-title-group">
                  <h3>Cơ Cấu Theo Danh Mục</h3>
                  <p>Tỷ trọng tiền bánh bán ra theo danh mục</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "10px" }}>
                <ShareBars items={report.categoryShare} colors={CATEGORY_COLORS} loading={loading} />
              </div>
            </div>

            <div style={{ background: "#fff0f4", borderRadius: "14px", padding: "12px", marginTop: "16px", fontSize: "12px", color: "#de5d7c", fontWeight: "600" }}>
              <ion-icon name="bulb-outline" style={{ verticalAlign: "-2px", marginRight: "4px" }}></ion-icon>{report.categoryShare.length
                ? `${report.categoryShare[0].name} đang đóng góp doanh thu lớn nhất trong kỳ này.`
                : "Chưa có đơn hoàn tất nào trong kỳ này."}
            </div>
          </div>
        </div>

        {/* 2 Grid: Top Products & Payment Methods */}
        <div className="admin-grid-split">
          <div className="admin-card-box" style={{ margin: 0 }}>
            <div className="admin-card-box-header">
              <div className="card-title-group">
                <h3>Top 5 Bánh Bán Chạy</h3>
                <p>Xếp theo số lượng bán trong {periodLabel.toLowerCase()}</p>
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
                    <th>TIỀN BÁNH</th>
                    <th>TỶ TRỌNG</th>
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
                        <span style={{ color: "#64748b", fontWeight: "700" }}>{c.percent}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-card-box" style={{ margin: 0 }}>
            <div className="admin-card-box-header">
              <div className="card-title-group">
                <h3>Phương Thức Thanh Toán</h3>
                <p>Doanh thu theo cách khách thanh toán</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "10px" }}>
              <ShareBars items={report.paymentShare} colors={PAYMENT_COLORS} loading={loading} />
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import AdminHeader from "../components/AdminHeader";
import { adminStatisticalApi } from "../../api/admin";
import { formatVND, formatDate, toLocalDateInput, apiErrorMessage } from "../../utils/format";
import { saveBlob, downloadErrorMessage } from "../../utils/download";
import popup from "../../utils/popup";

const CATEGORY_COLORS = ["#de5d7c", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];
const PAYMENT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#de5d7c", "#8b5cf6"];

const EMPTY_REPORT = {
  periodStart: null,
  endDate: null,
  revenue: 0,
  count: 0,
  cancelled: 0,
  itemsSold: 0,
  avg: 0,
  chart: [],
  categoryShare: [],
  paymentShare: [],
  topProducts: [],
};

const shortMoney = (v) => {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}K`;
  return String(v);
};

// Số liệu do backend tính (/admin/statistical/report) nên màn hình và file Excel luôn khớp nhau;
// ở đây chỉ đổi Decimal (chuỗi) sang số và tính chiều cao cột biểu đồ
const toViewModel = (r) => {
  const rows = r.buckets.map((b) => ({ label: b.label, fullLabel: b.full_label, rev: Number(b.revenue) }));
  const max = Math.max(0, ...rows.map((b) => b.rev));
  const shares = (items) => items.map((c) => ({ ...c, value: Number(c.value) }));
  return {
    periodStart: r.start_date,
    endDate: r.end_date,
    revenue: Number(r.revenue),
    count: r.order_count,
    cancelled: r.cancelled_count,
    itemsSold: r.items_sold,
    avg: Number(r.avg_order_value),
    chart: rows.map((b) => ({
      ...b,
      h: max ? Math.max(4, Math.round((b.rev / max) * 100)) : 4,
      isPeak: max > 0 && b.rev === max,
    })),
    categoryShare: shares(r.category_share),
    paymentShare: shares(r.payment_share),
    topProducts: r.product_ranking.slice(0, 5).map((p) => ({ ...p, revenue: Number(p.revenue) })),
  };
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
  const [report, setReport] = useState(EMPTY_REPORT);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
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

  // Bật trạng thái tải ngay lúc đổi kỳ (thay vì trong effect) để không render 2 lần
  const changePeriod = (key) => {
    if (key === activePeriod) return;
    setLoading(true);
    setError("");
    setActivePeriod(key);
  };

  useEffect(() => {
    let ignore = false;
    adminStatisticalApi
      .getReport(activePeriod)
      .then((res) => {
        if (!ignore) setReport(toViewModel(res.data));
      })
      .catch((err) => {
        if (!ignore) setError(apiErrorMessage(err, "Không tải được dữ liệu báo cáo"));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [activePeriod]);

  const peak = report.chart.find((b) => b.isPeak);
  const chartTitle = activePeriod === "today" ? "Theo Giờ" : ["week", "month"].includes(activePeriod) ? "Theo Ngày" : "Theo Tháng";
  const showBarValues = report.chart.length <= 12;

  const exportExcel = async () => {
    setExporting(true);
    try {
      const blob = await adminStatisticalApi.exportReport(activePeriod);
      saveBlob(blob, `bao-cao-doanh-thu-${activePeriod}-${toLocalDateInput(new Date())}.xlsx`);
    } catch (err) {
      popup.error(await downloadErrorMessage(err, "Không xuất được file Excel"));
    } finally {
      setExporting(false);
    }
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
              <span>{formatDate(report.periodStart)} - {formatDate(report.endDate || now)}</span>
            </div>
            <button className="btn-pill-primary" type="button" onClick={exportExcel} disabled={loading || exporting}>
              <ion-icon name={exporting ? "hourglass-outline" : "download-outline"}></ion-icon>
              <span>{exporting ? "Đang xuất..." : "Xuất Excel"}</span>
            </button>
          </div>
        </div>

        {/* Period Pills */}
        <div className="admin-filter-tabs">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => changePeriod(p.key)}
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

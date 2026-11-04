import { useEffect, useState } from "react";
import AdminHeader from "../components/AdminHeader";
import { adminStatisticalApi } from "../../api/admin";
import { formatVND, toLocalDateInput, apiErrorMessage } from "../../utils/format";
import { saveBlob, downloadErrorMessage } from "../../utils/download";
import popup from "../../utils/popup";
import "./Statistical.css";

const TIME_GROUPS = [
  { key: "day", label: "Ngày" },
  { key: "month", label: "Tháng" },
  { key: "quarter", label: "Quý" },
  { key: "year", label: "Năm" },
];
const groupLabel = (key) => TIME_GROUPS.find((g) => g.key === key)?.label.toLowerCase() || "";

// "2026-10-28" -> "28/10/2026" (không qua Date để khỏi lệch múi giờ)
const dmy = (s) => (s ? s.split("-").reverse().join("/") : "—");
const money = (v) => formatVND(v, " đ");

const rangeError = (from, to) =>
  !from || !to ? "Vui lòng chọn đủ Từ ngày và Đến ngày." : from > to ? "Từ ngày phải nhỏ hơn hoặc bằng Đến ngày." : "";
// Bảng thu - chi: theo ngày lọc khoảng ngày, theo tháng / quý chọn năm, theo năm liệt kê mọi năm
const usesYear = (f) => ["month", "quarter"].includes(f.group_by);
// Bảng chi tiết xem theo ngày thì mỗi ngày một cột nên giới hạn số ngày (khớp backend)
const MAX_DETAIL_DAYS = 92;
const dayCount = (from, to) => Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
const detailError = (f) =>
  rangeError(f.detail_from_date, f.detail_to_date) ||
  (f.detail_group_by === "day" && dayCount(f.detail_from_date, f.detail_to_date) > MAX_DETAIL_DAYS
    ? `Xem theo ngày chỉ chọn tối đa ${MAX_DETAIL_DAYS} ngày, hãy rút ngắn khoảng ngày hoặc xem theo tháng.`
    : "");
const filterError = (f) =>
  rangeError(f.from_date, f.to_date) ||
  (f.group_by === "day" ? rangeError(f.time_from_date, f.time_to_date) : "") ||
  detailError(f);
const toParams = ({ time_from_date, time_to_date, time_year, ...rest }) => ({
  ...rest,
  ...(rest.group_by === "day" && { time_from_date, time_to_date }),
  ...(usesYear(rest) && { time_year }),
});

const EMPTY_PIVOT = { columns: [], rows: [], column_totals: [], count: 0, total: 0 };
const EMPTY_REPORT = {
  first_year: null,
  last_year: null,
  summary: null,
  product_sales: [],
  by_time: [],
  by_staff: EMPTY_PIVOT,
  by_customer: EMPTY_PIVOT,
  by_product: EMPTY_PIVOT,
};

function Section({ title, subtitle, actions, children }) {
  return (
    <div className="admin-card-box">
      <div className="admin-card-box-header">
        <div className="card-title-group">
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function GroupTabs({ items, value, onChange }) {
  return (
    <div className="report-group-tabs">
      {items.map((g) => (
        <button key={g.key} type="button" onClick={() => onChange(g.key)} className={`tab-pill-btn ${value === g.key ? "active" : ""}`}>
          {g.label}
        </button>
      ))}
    </div>
  );
}

// Bộ lọc khoảng ngày đặt ngay trong bảng mà nó áp dụng
function DateRangeFilter({ from, to, onChange, extraError }) {
  const error = rangeError(from, to) || extraError;
  return (
    <div className="report-filter-row">
      <label>
        Từ ngày
        <input type="date" value={from} max={to || undefined} onChange={(e) => onChange(e.target.value, to)} />
      </label>
      <label>
        Đến ngày
        <input type="date" value={to} min={from || undefined} onChange={(e) => onChange(from, e.target.value)} />
      </label>
      {error && <span className="report-filter-error">{error}</span>}
    </div>
  );
}

function YearFilter({ value, years, onChange }) {
  return (
    <div className="report-filter-row">
      <label>
        Năm
        <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function EmptyRow({ colSpan, loading }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ textAlign: "center", color: "#8c9ba5" }}>
        {loading ? "Đang tải..." : "Chưa có hóa đơn trong khoảng thời gian này."}
      </td>
    </tr>
  );
}

// Bảng thống kê chéo: mỗi dòng một nhân viên / khách hàng / sản phẩm, mỗi cột một kỳ
function PivotTable({ data, nameLabel, subLabel, countLabel, loading }) {
  const colSpan = data.columns.length + 5;
  return (
    <div className="admin-table-clean-wrapper report-table-scroll">
      <table className="admin-table-clean report-table">
        <thead>
          <tr>
            <th style={{ width: "44px" }}>STT</th>
            <th>{nameLabel}</th>
            <th>{subLabel}</th>
            {data.columns.map((c) => (
              <th key={c} className="num">{c}</th>
            ))}
            <th className="num">Tổng cộng</th>
            <th className="num">{countLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 && <EmptyRow colSpan={colSpan} loading={loading} />}
          {data.rows.map((r, idx) => (
            <tr key={`${idx}-${r.name}`}>
              <td>{idx + 1}</td>
              <td style={{ fontWeight: "700", color: "#1e293b" }}>{r.name}</td>
              <td style={{ color: "#64748b" }}>{r.sub || "—"}</td>
              {r.values.map((v, i) => (
                <td key={data.columns[i]} className={`num ${Number(v) ? "" : "muted"}`}>
                  {Number(v) ? money(v) : "—"}
                </td>
              ))}
              <td className="num strong">{money(r.total)}</td>
              <td className="num">{r.count.toLocaleString("vi-VN")}</td>
            </tr>
          ))}
        </tbody>
        {data.rows.length > 0 && (
          <tfoot>
            <tr>
              <td></td>
              <td colSpan="2">Tổng cộng</td>
              {data.column_totals.map((v, i) => (
                <td key={data.columns[i]} className="num">{money(v)}</td>
              ))}
              <td className="num">{money(data.total)}</td>
              <td className="num">{data.count.toLocaleString("vi-VN")}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

const TOP_PRODUCTS = 5;
const percent = (v, total) => (total ? `${((v / total) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%` : "0%");

// Top sản phẩm bán chạy (theo tiền bánh) trong khoảng ngày của phần tổng quan
function TopProducts({ sales, loading }) {
  const [showAll, setShowAll] = useState(false);

  const rows = sales.map((r) => ({ ...r, value: Number(r.amount) })).filter((r) => r.value > 0);
  const total = rows.reduce((t, r) => t + r.value, 0);
  const max = rows[0]?.value || 0;
  const shown = showAll ? rows : rows.slice(0, TOP_PRODUCTS);

  return (
    <div className="top-products">
      <div className="top-products-head">
        <h4>Sản phẩm bán chạy</h4>
        {rows.length > 0 && (
          <span>
            Tổng tiền bánh <b>{money(total)}</b> · {rows.length} sản phẩm
          </span>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="product-chart-empty">{loading ? "Đang tải..." : "Chưa có sản phẩm nào được bán trong khoảng thời gian này."}</div>
      ) : (
        <>
          <ol className="product-chart">
            {shown.map((r, i) => (
              <li key={`${r.name}-${r.category}`} className="product-chart-row" tabIndex={0}>
                <span className="product-chart-rank">{i + 1}</span>
                <span className="product-chart-name">
                  <b>{r.name}</b>
                  <small>{r.category}</small>
                </span>
                <span className="product-chart-track">
                  <span className="product-chart-bar" style={{ width: `${Math.max(1, (r.value / max) * 100)}%` }} />
                </span>
                <span className="product-chart-value">
                  {money(r.value)}
                  <small>{percent(r.value, total)}</small>
                </span>
                <span className="product-chart-tip" role="tooltip">
                  <b>{r.name}</b>
                  <span>Doanh thu: {money(r.value)}</span>
                  <span>Tỷ trọng: {percent(r.value, total)}</span>
                  <span>Số lượng bán: {r.quantity.toLocaleString("vi-VN")}</span>
                </span>
              </li>
            ))}
          </ol>
          {rows.length > TOP_PRODUCTS && (
            <button type="button" className="report-more-btn" onClick={() => setShowAll((v) => !v)}>
              {showAll ? `Thu gọn (top ${TOP_PRODUCTS})` : `Xem tất cả ${rows.length} sản phẩm`}
              <ion-icon name={showAll ? "chevron-up-outline" : "chevron-down-outline"}></ion-icon>
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ---- Biểu đồ xu hướng thu - chi theo kỳ ----
// Nhãn trục ngang ngắn gọn: "Tháng 01/2026" -> "T1", "Quý 2/2026" -> "Q2", "Năm 2026" -> "2026", "05/10/2026" -> "05/10"
const shortPeriod = (group, label) => {
  const n = label.match(/\d+/g) || [label];
  if (group === "day") return `${n[0]}/${n[1]}`;
  if (group === "month") return `T${Number(n[0])}`;
  if (group === "quarter") return `Q${n[0]}`;
  return n[0];
};
// Trục dọc: 1.500.000 -> "1,5 tr"
const compactMoney = (v) => {
  const fmt = (x, unit) => `${x.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}${unit}`;
  if (v >= 1e9) return fmt(v / 1e9, " tỷ");
  if (v >= 1e6) return fmt(v / 1e6, " tr");
  if (v >= 1e3) return fmt(v / 1e3, "k");
  return fmt(v, "");
};
const niceStep = (raw) => {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
};
const MAX_X_LABELS = 16;

function TrendChart({ rows, group, loading }) {
  const data = rows.map((r) => ({
    label: r.label,
    short: shortPeriod(group, r.label),
    revenue: Number(r.revenue),
    expense: Number(r.expense),
    profit: Number(r.profit),
    invoices: r.invoice_count,
  }));
  const max = Math.max(0, ...data.map((d) => Math.max(d.revenue, d.expense)));
  if (max === 0) {
    return <div className="product-chart-empty">{loading ? "Đang tải..." : "Chưa có thu – chi trong khoảng thời gian này."}</div>;
  }

  const step = niceStep(max / 4);
  const top = step * Math.ceil(max / step);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const pct = (v) => `${(v / top) * 100}%`;
  // Nhiều kỳ (xem theo ngày) thì thưa nhãn trục ngang để không chồng chữ
  const every = Math.ceil(data.length / MAX_X_LABELS);

  return (
    <div className={`trend-chart ${loading ? "is-loading" : ""}`}>
      <div className="trend-legend">
        <span><i className="trend-swatch thu" />Tổng thu</span>
        <span><i className="trend-swatch chi" />Tổng chi</span>
      </div>
      <div className="trend-body">
        <div className="trend-yaxis">
          {ticks.map((t) => (
            <span key={t} style={{ bottom: pct(t) }}>{compactMoney(t)}</span>
          ))}
        </div>
        <div className="trend-scroll">
          <div className="trend-plot" style={{ minWidth: `${data.length * 30}px` }}>
            <div className="trend-grid">
              {ticks.map((t) => (
                <span key={t} style={{ bottom: pct(t) }} />
              ))}
            </div>
            {data.map((d, i) => (
              <div key={d.label} className="trend-col" tabIndex={0}>
                <div className="trend-bars">
                  <span className="trend-bar thu" style={{ height: pct(d.revenue) }} />
                  <span className="trend-bar chi" style={{ height: pct(d.expense) }} />
                </div>
                <span className="trend-x">{i % every === 0 ? d.short : ""}</span>
                <div className={`trend-tip ${i >= data.length / 2 ? "to-left" : ""}`} role="tooltip">
                  <b>{d.label}</b>
                  <span><i className="trend-swatch thu" />Thu: {money(d.revenue)}</span>
                  <span><i className="trend-swatch chi" />Chi: {money(d.expense)}</span>
                  <span className={d.profit < 0 ? "neg" : ""}>Lợi nhuận: {money(d.profit)}</span>
                  <span>{d.invoices.toLocaleString("vi-VN")} hóa đơn</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Chọn nhanh khoảng ngày cho bộ lọc chung
const DATE_PRESETS = [
  { key: "today", label: "Hôm nay", range: (now) => [now, now] },
  { key: "7d", label: "7 ngày qua", range: (now) => [new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6), now] },
  { key: "month", label: "Tháng này", range: (now) => [new Date(now.getFullYear(), now.getMonth(), 1), now] },
  { key: "year", label: "Năm nay", range: (now) => [new Date(now.getFullYear(), 0, 1), now] },
];
const presetRange = (p) => p.range(new Date()).map(toLocalDateInput);

function RangePresets({ from, to, onChange }) {
  return (
    <div className="report-group-tabs">
      {DATE_PRESETS.map((p) => {
        const [pFrom, pTo] = presetRange(p);
        return (
          <button
            key={p.key}
            type="button"
            className={`tab-pill-btn ${pFrom === from && pTo === to ? "active" : ""}`}
            onClick={() => onChange(pFrom, pTo)}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function KpiTile({ label, value, note, icon, tone }) {
  return (
    <div className={`report-kpi ${tone || ""}`}>
      <div className="report-kpi-label">
        <ion-icon name={icon}></ion-icon>
        <span>{label}</span>
      </div>
      <div className="report-kpi-value">{value}</div>
      {note && <div className="report-kpi-note">{note}</div>}
    </div>
  );
}

// Các bảng thống kê phụ: ẩn mặc định, bấm nút mới hiện
const DETAIL_TABLES = [
  { key: "staff", label: "Theo nhân viên", icon: "people-outline" },
  { key: "customer", label: "Theo khách hàng", icon: "person-outline" },
  { key: "product", label: "Theo sản phẩm", icon: "cube-outline" },
];

export default function Statistical() {
  // Mặc định từ 01/01 năm nay đến hôm nay
  const [filter, setFilter] = useState(() => {
    const now = new Date();
    const from = toLocalDateInput(new Date(now.getFullYear(), 0, 1));
    const to = toLocalDateInput(now);
    return {
      from_date: from,
      to_date: to,
      time_from_date: from,
      time_to_date: to,
      time_year: now.getFullYear(),
      group_by: "month",
      detail_from_date: from,
      detail_to_date: to,
      detail_group_by: "month",
    };
  });
  const [report, setReport] = useState(EMPTY_REPORT);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [openDetails, setOpenDetails] = useState([]);
  const [showTimeTable, setShowTimeTable] = useState(false);
  const toggleDetail = (key) =>
    setOpenDetails((list) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]));
  const isOpen = (key) => openDetails.includes(key);

  const invalid = filterError(filter);

  // Bật trạng thái tải ngay lúc đổi bộ lọc (thay vì trong effect) để không render 2 lần
  const updateFilter = (patch) => {
    const next = { ...filter, ...patch };
    if (Object.keys(patch).every((k) => patch[k] === filter[k])) return;
    setFilter(next);
    setError("");
    if (!filterError(next)) setLoading(true);
  };

  useEffect(() => {
    if (invalid) return;
    let ignore = false;
    adminStatisticalApi
      .getReport(toParams(filter))
      .then((res) => {
        if (!ignore) setReport(res.data);
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
  }, [filter, invalid]);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const blob = await adminStatisticalApi.exportReport(toParams(filter));
      const compact = (s) => s.replaceAll("-", "");
      saveBlob(blob, `bao-cao-doanh-thu-${compact(filter.from_date)}-${compact(filter.to_date)}.xlsx`);
    } catch (err) {
      popup.error(await downloadErrorMessage(err, "Không xuất được file Excel"));
    } finally {
      setExporting(false);
    }
  };

  const s = report.summary;
  const rangeText = `từ ${dmy(filter.from_date)} đến ${dmy(filter.to_date)}`;
  const timeRangeText = `từ ${dmy(filter.time_from_date)} đến ${dmy(filter.time_to_date)}`;
  const yearsText = !report.first_year
    ? "toàn bộ dữ liệu"
    : report.first_year === report.last_year
      ? `toàn bộ dữ liệu năm ${report.first_year}`
      : `toàn bộ dữ liệu từ năm ${report.first_year} đến năm ${report.last_year}`;
  // Các năm có dữ liệu để chọn khi xem thu - chi theo tháng / quý
  const firstYear = Math.min(report.first_year || filter.time_year, filter.time_year);
  const lastYear = Math.max(report.last_year || filter.time_year, filter.time_year);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => lastYear - i);
  const timeScopeText =
    filter.group_by === "day" ? timeRangeText : usesYear(filter) ? `năm ${filter.time_year}` : yearsText;
  const show = (v, fmt = money) => (loading || !s ? "..." : fmt(v));
  const count = (v) => v.toLocaleString("vi-VN");
  const profitNeg = s && Number(s.profit) < 0;
  const kpis = [
    {
      label: "Tổng thu (tiền hóa đơn)",
      icon: "cash-outline",
      tone: "primary",
      value: show(s?.revenue),
      note: s && !loading ? `Tiền hàng ${money(s.gross_amount)} − voucher ${money(s.discount_amount)}` : "",
    },
    {
      label: "Tổng chi (nhập hàng)",
      icon: "cube-outline",
      value: show(s?.expense),
      note: s && !loading ? `${count(s.import_count)} phiếu nhập hoàn tất` : "",
    },
    {
      label: "Lợi nhuận",
      icon: profitNeg ? "trending-down-outline" : "trending-up-outline",
      tone: profitNeg ? "neg" : "good",
      value: show(s?.profit),
      note: "Tổng thu − tổng chi",
    },
    {
      label: "Số hóa đơn",
      icon: "receipt-outline",
      value: show(s?.invoice_count, count),
      note: s && !loading ? `${count(s.cancelled_count)} đơn bị hủy` : "",
    },
    {
      label: "Số bánh bán ra",
      icon: "basket-outline",
      value: show(s?.items_sold, count),
      note: s && !loading && s.invoice_count ? `TB ${money(Number(s.revenue) / s.invoice_count)} / hóa đơn` : "",
    },
  ];
  const detailRangeText = `từ ${dmy(filter.detail_from_date)} đến ${dmy(filter.detail_to_date)}`;
  const detailGroup = TIME_GROUPS.find((g) => g.key === filter.detail_group_by).label;

  const timeTotals = report.by_time.reduce(
    (t, r) => ({
      invoice_count: t.invoice_count + r.invoice_count,
      revenue: t.revenue + Number(r.revenue),
      import_count: t.import_count + r.import_count,
      expense: t.expense + Number(r.expense),
      profit: t.profit + Number(r.profit),
    }),
    { invoice_count: 0, revenue: 0, import_count: 0, expense: 0, profit: 0 },
  );

  return (
    <>
      <AdminHeader />

      <div className="admin-page-container">
        {/* Header Row */}
        <div className="admin-page-header-row">
          <div className="admin-page-title-group">
            <h1>Báo Cáo Doanh Thu</h1>
            <p>Tổng tiền hóa đơn, thu – chi – lợi nhuận và thống kê theo nhân viên, khách hàng, sản phẩm</p>
          </div>

          <div className="admin-page-actions">
            <button className="btn-pill-primary" type="button" onClick={exportExcel} disabled={loading || exporting || !!invalid}>
              <ion-icon name={exporting ? "hourglass-outline" : "download-outline"}></ion-icon>
              <span>{exporting ? "Đang xuất..." : "Xuất Excel"}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="admin-card-box" style={{ color: "#b91c1c", fontWeight: "600" }}>
            {error}
          </div>
        )}

        {/* a) Tổng tiền hóa đơn từ ngày a đến ngày b: một bộ lọc ngày chung cho thẻ số liệu và biểu đồ */}
        <Section
          title="Tổng Quan"
          subtitle={`Các hóa đơn (đơn hoàn tất) ${rangeText}`}
          actions={
            <RangePresets
              from={filter.from_date}
              to={filter.to_date}
              onChange={(from_date, to_date) => updateFilter({ from_date, to_date })}
            />
          }
        >
          <DateRangeFilter
            from={filter.from_date}
            to={filter.to_date}
            onChange={(from_date, to_date) => updateFilter({ from_date, to_date })}
          />
          <div className="report-kpi-grid">
            {kpis.map((k) => (
              <KpiTile key={k.label} {...k} />
            ))}
          </div>
          <TopProducts sales={report.product_sales} loading={loading} />
        </Section>

        {/* b) Thu - chi - lợi nhuận theo ngày / tháng / quý / năm */}
        <Section
          title={`Xu Hướng Thu – Chi Theo ${TIME_GROUPS.find((g) => g.key === filter.group_by).label}`}
          subtitle={`Tổng thu = tổng tiền hóa đơn, tổng chi = tổng tiền phiếu nhập hàng, ${timeScopeText}`}
          actions={<GroupTabs items={TIME_GROUPS} value={filter.group_by} onChange={(key) => updateFilter({ group_by: key })} />}
        >
          {filter.group_by === "day" && (
            <DateRangeFilter
              from={filter.time_from_date}
              to={filter.time_to_date}
              onChange={(time_from_date, time_to_date) => updateFilter({ time_from_date, time_to_date })}
            />
          )}
          {usesYear(filter) && (
            <YearFilter value={filter.time_year} years={years} onChange={(time_year) => updateFilter({ time_year })} />
          )}
          <TrendChart rows={report.by_time} group={filter.group_by} loading={loading} />
          <button type="button" className="report-more-btn" aria-expanded={showTimeTable} onClick={() => setShowTimeTable((v) => !v)}>
            <ion-icon name="list-outline"></ion-icon>
            {showTimeTable ? "Ẩn bảng số liệu" : "Xem bảng số liệu"}
            <ion-icon name={showTimeTable ? "chevron-up-outline" : "chevron-down-outline"}></ion-icon>
          </button>
          {showTimeTable && (
            <div className="report-time-table">
              <div className="admin-table-clean-wrapper report-table-scroll">
                <table className="admin-table-clean report-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th className="num">Số hóa đơn</th>
                      <th className="num">Tổng thu</th>
                      <th className="num">Số phiếu nhập</th>
                      <th className="num">Tổng chi</th>
                      <th className="num">Lợi nhuận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.by_time.length === 0 && <EmptyRow colSpan={6} loading={loading} />}
                    {report.by_time.map((r) => (
                      <tr key={r.label}>
                        <td style={{ fontWeight: "700", color: "#1e293b" }}>{r.label}</td>
                        <td className="num">{r.invoice_count}</td>
                        <td className="num">{money(r.revenue)}</td>
                        <td className="num">{r.import_count}</td>
                        <td className="num">{money(r.expense)}</td>
                        <td className={`num ${Number(r.profit) < 0 ? "neg" : "strong"}`}>{money(r.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {report.by_time.length > 0 && (
                    <tfoot>
                      <tr>
                        <td>Tổng cộng</td>
                        <td className="num">{timeTotals.invoice_count}</td>
                        <td className="num">{money(timeTotals.revenue)}</td>
                        <td className="num">{timeTotals.import_count}</td>
                        <td className="num">{money(timeTotals.expense)}</td>
                        <td className={`num ${timeTotals.profit < 0 ? "neg" : ""}`}>{money(timeTotals.profit)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </Section>

        {/* Các bảng thống kê chi tiết: ẩn mặc định, bấm nút để xem; dùng chung khoảng ngày và cách gom cột */}
        <div className="admin-card-box">
          <div className="report-detail-bar">
            <div className="card-title-group">
              <h3>Thống Kê Chi Tiết</h3>
              <p>Bấm để xem / ẩn bảng thống kê chéo theo nhân viên, khách hàng, sản phẩm</p>
            </div>
            <div className="report-detail-buttons">
              {DETAIL_TABLES.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  className={`tab-pill-btn ${isOpen(d.key) ? "active" : ""}`}
                  aria-expanded={isOpen(d.key)}
                  onClick={() => toggleDetail(d.key)}
                >
                  <ion-icon name={d.icon}></ion-icon>
                  <span>{d.label}</span>
                  <ion-icon name={isOpen(d.key) ? "chevron-up-outline" : "chevron-down-outline"}></ion-icon>
                </button>
              ))}
            </div>
          </div>

          {openDetails.length > 0 && (
            <div className="report-detail-controls">
              <div className="report-detail-control">
                <span>Mỗi cột là một</span>
                <GroupTabs
                  items={TIME_GROUPS}
                  value={filter.detail_group_by}
                  onChange={(detail_group_by) => updateFilter({ detail_group_by })}
                />
              </div>
              <DateRangeFilter
                from={filter.detail_from_date}
                to={filter.detail_to_date}
                extraError={detailError(filter)}
                onChange={(detail_from_date, detail_to_date) => updateFilter({ detail_from_date, detail_to_date })}
              />
            </div>
          )}
        </div>

        {/* c) Nhân viên */}
        {isOpen("staff") && (
          <Section
            title={`Thống Kê Theo Nhân Viên Và ${detailGroup}`}
            subtitle={`Tổng tiền hóa đơn mỗi nhân viên lập theo ${groupLabel(filter.detail_group_by)}, ${detailRangeText}`}
          >
            <PivotTable data={report.by_staff} nameLabel="Nhân viên" subLabel="SĐT" countLabel="Số hóa đơn" loading={loading} />
            <div className="report-note">Nhân viên lập hóa đơn là người chuyển đơn sang trạng thái Hoàn tất.</div>
          </Section>
        )}

        {/* d) Khách hàng */}
        {isOpen("customer") && (
          <Section
            title={`Thống Kê Theo Khách Hàng Và ${detailGroup}`}
            subtitle={`Tổng tiền hóa đơn của từng khách hàng theo ${groupLabel(filter.detail_group_by)}, ${detailRangeText}`}
          >
            <PivotTable data={report.by_customer} nameLabel="Khách hàng" subLabel="SĐT" countLabel="Số hóa đơn" loading={loading} />
          </Section>
        )}

        {/* e) Sản phẩm */}
        {isOpen("product") && (
          <Section
            title={`Thống Kê Theo Sản Phẩm Và ${detailGroup}`}
            subtitle={`Tổng tiền bánh trên hóa đơn của từng sản phẩm theo ${groupLabel(filter.detail_group_by)}, ${detailRangeText}`}
          >
            <PivotTable data={report.by_product} nameLabel="Sản phẩm" subLabel="Danh mục" countLabel="SL bán" loading={loading} />
            <div className="report-note">Tiền bánh = đơn giá × số lượng trên hóa đơn (trước giảm giá voucher).</div>
          </Section>
        )}
      </div>
    </>
  );
}

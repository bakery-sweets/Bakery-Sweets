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
const CUSTOMER_GROUPS = TIME_GROUPS.filter((g) => ["quarter", "year"].includes(g.key));
const groupLabel = (key) => TIME_GROUPS.find((g) => g.key === key)?.label.toLowerCase() || "";

// "2026-10-28" -> "28/10/2026" (không qua Date để khỏi lệch múi giờ)
const dmy = (s) => (s ? s.split("-").reverse().join("/") : "—");
const money = (v) => formatVND(v, " đ");

const rangeError = (from, to) =>
  !from || !to ? "Vui lòng chọn đủ Từ ngày và Đến ngày." : from > to ? "Từ ngày phải nhỏ hơn hoặc bằng Đến ngày." : "";
// Bảng thu - chi: theo ngày lọc khoảng ngày, theo tháng / quý chọn năm, theo năm liệt kê mọi năm
const usesYear = (f) => ["month", "quarter"].includes(f.group_by);
const filterError = (f) =>
  rangeError(f.from_date, f.to_date) || (f.group_by === "day" ? rangeError(f.time_from_date, f.time_to_date) : "");
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
function DateRangeFilter({ from, to, onChange }) {
  const error = rangeError(from, to);
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
      customer_group_by: "quarter",
    };
  });
  const [report, setReport] = useState(EMPTY_REPORT);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

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
  const summaryRows = [
    { label: "Số hóa đơn (đơn hoàn tất)", value: show(s?.invoice_count, count), note: s ? `${s.cancelled_count} đơn bị hủy trong kỳ` : "" },
    { label: "Số bánh bán ra", value: show(s?.items_sold, count) },
    { label: "Tổng tiền hàng (trước giảm giá)", value: show(s?.gross_amount) },
    { label: "Giảm giá voucher", value: show(s?.discount_amount) },
    { label: "Tổng tiền hóa đơn (Tổng thu)", value: show(s?.revenue), note: "Tiền hàng − giảm giá", strong: true },
    { label: "Tổng chi (nhập hàng)", value: show(s?.expense), note: s ? `${s.import_count} phiếu nhập hoàn tất` : "" },
    { label: "Lợi nhuận", value: show(s?.profit), note: "Tổng thu − tổng chi", strong: true, neg: s && Number(s.profit) < 0 },
  ];

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

        {/* a) Tổng tiền hóa đơn từ ngày a đến ngày b */}
        <Section title="Tổng Tiền Hóa Đơn Theo Khoảng Ngày" subtitle={`Các hóa đơn (đơn hoàn tất) ${rangeText}`}>
          <DateRangeFilter
            from={filter.from_date}
            to={filter.to_date}
            onChange={(from_date, to_date) => updateFilter({ from_date, to_date })}
          />
          <div className="admin-table-clean-wrapper">
            <table className="admin-table-clean report-table">
              <thead>
                <tr>
                  <th>Chỉ tiêu</th>
                  <th className="num">Giá trị</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((r) => (
                  <tr key={r.label}>
                    <td style={{ fontWeight: r.strong ? "800" : "600", color: "#1e293b" }}>{r.label}</td>
                    <td className={`num ${r.neg ? "neg" : r.strong ? "strong" : ""}`} style={{ fontWeight: r.strong ? "800" : "700" }}>
                      {r.value}
                    </td>
                    <td style={{ color: "#64748b" }}>{r.note || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* b) Thu - chi - lợi nhuận theo ngày / tháng / quý / năm */}
        <Section
          title={`Thu – Chi – Lợi Nhuận Theo ${TIME_GROUPS.find((g) => g.key === filter.group_by).label}`}
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
        </Section>

        {/* c) Nhân viên x năm */}
        <Section title="Thống Kê Theo Nhân Viên Và Năm" subtitle={`Tổng tiền hóa đơn mỗi nhân viên lập theo từng năm, ${yearsText}`}>
          <PivotTable data={report.by_staff} nameLabel="Nhân viên" subLabel="SĐT" countLabel="Số hóa đơn" loading={loading} />
          <div className="report-note">Nhân viên lập hóa đơn là người chuyển đơn sang trạng thái Hoàn tất.</div>
        </Section>

        {/* d) Khách hàng x quý / năm */}
        <Section
          title={`Thống Kê Theo Khách Hàng Và ${filter.customer_group_by === "year" ? "Năm" : "Quý"}`}
          subtitle={`Tổng tiền hóa đơn của từng khách hàng theo ${groupLabel(filter.customer_group_by)}, ${yearsText}`}
          actions={<GroupTabs items={CUSTOMER_GROUPS} value={filter.customer_group_by} onChange={(key) => updateFilter({ customer_group_by: key })} />}
        >
          <PivotTable data={report.by_customer} nameLabel="Khách hàng" subLabel="SĐT" countLabel="Số hóa đơn" loading={loading} />
        </Section>

        {/* e) Sản phẩm x quý */}
        <Section title="Thống Kê Theo Sản Phẩm Và Quý" subtitle={`Tổng tiền bánh trên hóa đơn của từng sản phẩm theo quý, ${yearsText}`}>
          <PivotTable data={report.by_product} nameLabel="Sản phẩm" subLabel="Danh mục" countLabel="SL bán" loading={loading} />
          <div className="report-note">Tiền bánh = đơn giá × số lượng trên hóa đơn (trước giảm giá voucher).</div>
        </Section>
      </div>
    </>
  );
}

import { useSearchParams } from "react-router-dom";

// Trang "Voucher & Khuyến Mãi" gộp 3 phần: chọn tab bằng ?tab= trên URL để tải lại trang vẫn giữ đúng tab
export const VOUCHER_TABS = [
  { key: "program", label: "Voucher Chương Trình", icon: "pricetags-outline", hint: "Mã dùng chung, giảm theo mức tổng tiền hóa đơn" },
  { key: "single-use", label: "Mã Dùng 1 Lần", icon: "ticket-outline", hint: "Mã ngẫu nhiên 8 ký tự, mỗi mã chỉ dùng cho 1 đơn" },
  { key: "products", label: "Khuyến Mãi Sản Phẩm", icon: "pricetag-outline", hint: "Giảm giá trực tiếp trên bánh, theo từng size" },
];

export const useVoucherTab = () => {
  const [params, setParams] = useSearchParams();
  const tab = VOUCHER_TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "program";
  const setTab = (key) => setParams(key === "program" ? {} : { tab: key }, { replace: true });
  return [tab, setTab];
};

export default function VoucherTabs() {
  const [tab, setTab] = useVoucherTab();
  return (
    <div role="tablist" aria-label="Loại voucher" style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
      {VOUCHER_TABS.map((t) => {
        const active = t.key === tab;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setTab(t.key)}
            style={{
              display: "flex", alignItems: "center", gap: "10px", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
              padding: "10px 16px", borderRadius: "12px", minWidth: "240px", flex: "1 1 240px", maxWidth: "360px",
              border: `1.5px solid ${active ? "#de5d7c" : "#e2e8f0"}`,
              background: active ? "#fff0f4" : "#fff",
              boxShadow: active ? "0 2px 10px rgba(222, 93, 124, 0.15)" : "none",
            }}
          >
            <ion-icon name={t.icon} style={{ fontSize: "22px", color: active ? "#de5d7c" : "#94a3b8", flexShrink: 0 }}></ion-icon>
            <span>
              <span style={{ display: "block", fontWeight: 800, fontSize: "13.5px", color: active ? "#be3a5c" : "#1e293b" }}>{t.label}</span>
              <span style={{ display: "block", fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>{t.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

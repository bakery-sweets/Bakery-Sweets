// In hóa đơn nhiệt khổ K80 (giấy 80mm, vùng in ~72mm) qua iframe ẩn,
// để không ảnh hưởng CSS @media print của trang đang mở (VD: bảng đối soát ở Quản lý đơn hàng)
import { formatDateTime, PAYMENT_METHOD, PAYMENT_STATUS } from "./format";

const money = (v) => `${Number(v || 0).toLocaleString("vi-VN")}đ`;

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const row = (label, value, cls = "") => `<div class="row ${cls}"><span>${label}</span><span>${value}</span></div>`;

const buildHtml = (order, { cashReceived, change, cashier }) => {
  const items = order.details
    .map(
      (d) => `
      <div class="item">
        <div class="item-name">${esc(d.product_name)} <span class="muted">(${esc(d.size_name)})</span></div>
        ${row(`${d.quantity} x ${money(d.price)}`, money(d.total_price))}
      </div>`
    )
    .join("");

  const discount = Number(order.discount_amount) > 0
    ? row(`Giảm giá${order.promotion_code ? ` (${esc(order.promotion_code)})` : ""}`, `-${money(order.discount_amount)}`)
    : "";

  const cash = cashReceived > 0
    ? row("Tiền khách đưa", money(cashReceived)) + row("Tiền thối lại", money(change), "bold")
    : "";

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Hóa đơn #${esc(order.order_code)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { width: 80mm; padding: 4mm 4mm 8mm; color: #000; font: 12px/1.4 "Courier New", Consolas, monospace; }
  .center { text-align: center; }
  .brand { font-size: 18px; font-weight: 700; letter-spacing: 2px; }
  .muted { color: #333; font-size: 11px; }
  .title { margin: 6px 0 2px; font-size: 14px; font-weight: 700; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .row span:last-child { text-align: right; white-space: nowrap; }
  .item { margin-bottom: 4px; }
  .item-name { font-weight: 700; word-break: break-word; }
  .bold { font-weight: 700; }
  .total { font-size: 15px; font-weight: 700; margin: 2px 0; }
  .note { margin-top: 4px; word-break: break-word; }
</style>
</head>
<body>
  <div class="center">
    <div class="brand">THE SWEETS</div>
    <div class="muted">Bánh ngọt &amp; Tráng miệng · Hotline 1900&nbsp;009</div>
    <div class="title">${order.status === "Completed" ? "HÓA ĐƠN BÁN HÀNG" : "PHIẾU ĐẶT BÁNH"}</div>
    <div>#${esc(order.order_code)}</div>
  </div>
  <hr />
  ${row("Ngày", esc(formatDateTime(order.order_date)))}
  ${row("Khách", esc(order.recipient_name))}
  ${row("SĐT", esc(order.recipient_phone))}
  ${order.status !== "Completed" && order.pickup_time ? row("Hẹn lấy", esc(formatDateTime(order.pickup_time)), "bold") : ""}
  ${cashier ? row("Thu ngân", esc(cashier)) : ""}
  <hr />
  ${items}
  <hr />
  ${row(`Tạm tính (${order.total_quantity} bánh)`, money(order.total_cost))}
  ${discount}
  ${row("TỔNG CỘNG", money(order.final_cost), "total")}
  <hr />
  ${row("Thanh toán", esc(PAYMENT_METHOD[order.payment_method] || order.payment_method))}
  ${row("Trạng thái", esc(PAYMENT_STATUS[order.payment_status] || order.payment_status))}
  ${cash}
  ${order.notes ? `<div class="note">Ghi chú: ${esc(order.notes)}</div>` : ""}
  <hr />
  <div class="center muted">Cảm ơn quý khách &amp; hẹn gặp lại!</div>
</body>
</html>`;
};

/**
 * In hóa đơn nhiệt K80 cho một đơn hàng (dữ liệu AdminOrderOut).
 * extras.cashReceived / extras.change: tiền khách đưa & tiền thối (chỉ có lúc vừa tạo đơn tiền mặt).
 */
export function printThermalReceipt(order, extras = {}) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  iframe.srcdoc = buildHtml(order, extras);

  const remove = () => iframe.isConnected && iframe.remove();
  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) return remove();
    win.onafterprint = () => setTimeout(remove, 300);
    win.focus();
    win.print();
    // Trình duyệt không bắn afterprint (một số bản Safari): tự dọn sau 1 phút
    setTimeout(remove, 60000);
  };
  document.body.appendChild(iframe);
}

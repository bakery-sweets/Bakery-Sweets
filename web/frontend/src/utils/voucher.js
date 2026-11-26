// Tiện ích voucher phía khách, dữ liệu lấy từ API /client/promotions (bảng promotions + invoice_promotions)

const money = (v) => `${Number(v).toLocaleString("vi-VN")}₫`;

const tiersOf = (p) =>
  [...(p.invoice_promotions || [])].sort((a, b) => Number(a.min_order_value) - Number(b.min_order_value));

// Mức đơn tối thiểu thấp nhất để áp dụng được mã
export const voucherMinOrder = (p) => {
  const tiers = tiersOf(p);
  return tiers.length ? Number(tiers[0].min_order_value) : 0;
};

// Mô tả ngắn tạo từ các mức giảm, dùng khi admin không nhập mô tả
export const voucherDescription = (p) => {
  if (p.description) return p.description;
  return tiersOf(p)
    .map((t) => {
      const cap = t.max_discount_value != null ? ` tối đa ${money(t.max_discount_value)}` : "";
      return `Giảm ${+Number(t.discount_percentage)}%${cap} cho đơn từ ${money(t.min_order_value)}`;
    })
    .join("; ");
};

// Tính giống ClientPromotionService.calculate_discount: lấy mức cao nhất mà đơn đạt tới
export const calcVoucherDiscount = (p, total) => {
  const reached = tiersOf(p).filter((t) => total >= Number(t.min_order_value));
  if (!reached.length) return 0;
  const tier = reached[reached.length - 1];
  let discount = (total * Number(tier.discount_percentage)) / 100;
  if (tier.max_discount_value != null && Number(tier.max_discount_value) > 0) {
    discount = Math.min(discount, Number(tier.max_discount_value));
  }
  return Math.round(Math.min(discount, total) * 100) / 100;
};

// Mã dùng 1 lần (bảng single_use_vouchers): `rule` là single_use trong kết quả POST /client/promotions/apply.
// Tính giống single_use_discount ở backend để số tiền giảm tự cập nhật khi giỏ hàng thay đổi
export const calcSingleUseDiscount = (rule, total) => {
  if (!rule || total < Number(rule.min_order_value || 0)) return 0;
  let discount =
    rule.discount_type === "fixed"
      ? Number(rule.discount_value)
      : (total * Number(rule.discount_value)) / 100;
  if (rule.discount_type !== "fixed" && rule.max_discount_value != null && Number(rule.max_discount_value) > 0) {
    discount = Math.min(discount, Number(rule.max_discount_value));
  }
  return Math.round(Math.min(discount, total) * 100) / 100;
};

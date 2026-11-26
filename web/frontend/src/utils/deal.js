// Khuyến mãi theo sản phẩm (bảng product_promotions): server đã trả sẵn giá sau giảm ở `price`,
// kèm `original_price`, `discount_percentage`, `promo_end_date`.
// Khách chỉ thấy "Khuyến mãi" và mức giảm — không bao giờ hiện lý do khuyến mãi.

// "-15%"
export const dealLabel = (pct) => (pct ? `-${+Number(pct)}%` : "");

const pad2 = (n) => String(n).padStart(2, "0");

// "Khuyến mãi đến 23:59 26/11" — tự ghép chuỗi vì toLocaleDateString("vi-VN") với ngày/tháng ra dạng "26-11"
export const dealEndText = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `Khuyến mãi đến ${pad2(d.getHours())}:${pad2(d.getMinutes())} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
};

// Giá gốc chỉ hiện khi thật sự lớn hơn giá bán
export const hasDeal = (price, originalPrice) => originalPrice != null && Number(originalPrice) > Number(price);

// "Size S (16cm)" -> "Size S" cho gọn trên thẻ bánh
const shortSizeName = (name) => (name || "").replace(/\s*\(.*?\)\s*/g, " ").trim();

// Dòng cho khách biết size nào đang khuyến mãi (chỉ tính size còn hàng), VD:
//   "Khuyến mãi -10% mọi size" | "Khuyến mãi -15%: Size M" | "Khuyến mãi: Size S -15%, Size M -10%"
export const dealSizesText = (product) => {
  const sizes = (product?.sizes || []).filter((s) => Number(s.stock_quantity) > 0);
  const deals = sizes.filter((s) => hasDeal(s.price, s.original_price));
  if (!deals.length) return "";
  const pcts = [...new Set(deals.map((s) => +Number(s.discount_percentage)))];
  if (pcts.length === 1) {
    if (deals.length === sizes.length) {
      return sizes.length > 1 ? `Khuyến mãi -${pcts[0]}% mọi size` : `Khuyến mãi -${pcts[0]}%`;
    }
    return `Khuyến mãi -${pcts[0]}%: ${deals.map((s) => shortSizeName(s.size_name)).join(", ")}`;
  }
  return `Khuyến mãi: ${deals.map((s) => `${shortSizeName(s.size_name)} -${+Number(s.discount_percentage)}%`).join(", ")}`;
};

// "Size S (16cm)" -> "S"; tên không theo dạng "Size ..." (VD: "Ly lớn 500ml") giữ nguyên
const tagSizeName = (name) => shortSizeName(name).replace(/^Size\s+/i, "");

// Chữ trên nhãn khuyến mãi ở góc ảnh thẻ bánh, ghi kèm size (chỉ tính size còn hàng), VD:
//   "-15% size M" | "-15% size S, M" | "-10% mọi size" | "S -15% · M -10%" | "-10%" (bánh chỉ có 1 size)
export const dealTagText = (product) => {
  const sizes = (product?.sizes || []).filter((s) => Number(s.stock_quantity) > 0);
  const deals = sizes.filter((s) => hasDeal(s.price, s.original_price));
  if (!deals.length) return "";
  const pcts = [...new Set(deals.map((s) => +Number(s.discount_percentage)))];
  if (pcts.length === 1) {
    if (deals.length === sizes.length) return sizes.length > 1 ? `-${pcts[0]}% mọi size` : `-${pcts[0]}%`;
    return `-${pcts[0]}% size ${deals.map((s) => tagSizeName(s.size_name)).join(", ")}`;
  }
  return deals.map((s) => `${tagSizeName(s.size_name)} -${+Number(s.discount_percentage)}%`).join(" · ");
};

// Size còn hàng đang được giảm nhiều nhất (null nếu không size nào được giảm)
export const bestDealSize = (product) =>
  (product?.sizes || [])
    .filter((s) => Number(s.stock_quantity) > 0 && hasDeal(s.price, s.original_price))
    .reduce((best, s) => (!best || Number(s.discount_percentage) > Number(best.discount_percentage) ? s : best), null);

// Giá hiển thị trên thẻ bánh — dùng chung cho thẻ, sắp xếp / lọc theo giá, gợi ý bánh liên quan để luôn khớp nhau.
// Size rẻ nhất không khuyến mãi nhưng size khác đang khuyến mãi (VD: chỉ size M giảm) → hiện giá size đang khuyến mãi.
// Trả về { price, original (giá gốc hoặc null), size (size đang khuyến mãi được hiện, hoặc null) }
export const cardPrice = (product) => {
  const minPrice = Number(product?.min_price || 0);
  const minHasDeal = hasDeal(product?.min_price, product?.min_original_price);
  const dealSize = bestDealSize(product);
  if (dealSize && !minHasDeal) {
    return { price: Number(dealSize.price), original: Number(dealSize.original_price), size: dealSize };
  }
  return { price: minPrice, original: minHasDeal ? Number(product.min_original_price) : null, size: null };
};

import PromotionList from "./PromotionList";
import SingleUseVoucherList from "./SingleUseVoucherList";
import ProductPromotionList from "./ProductPromotionList";
import { useVoucherTab } from "../components/VoucherTabs";

// Gộp vào 1 trang "Voucher & Khuyến Mãi": voucher chương trình (bảng promotions),
// mã dùng 1 lần (single_use_vouchers) và khuyến mãi sản phẩm (product_promotions)
export default function VoucherPage() {
  const [tab] = useVoucherTab();
  if (tab === "single-use") return <SingleUseVoucherList />;
  if (tab === "products") return <ProductPromotionList />;
  return <PromotionList />;
}

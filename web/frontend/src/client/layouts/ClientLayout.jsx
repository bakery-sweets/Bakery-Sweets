import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import CartDrawer from "../components/CartDrawer";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import { useRealtimeConnection, useRealtimeEvent } from "../../realtime/useRealtime";
import popup from "../../utils/popup";

export default function ClientLayout() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const fetchCart = useCartStore((s) => s.fetchCart);

  // Đồng bộ giỏ hàng từ server mỗi khi có phiên đăng nhập
  useEffect(() => {
    if (token) fetchCart().catch(() => {});
  }, [token, fetchCart]);

  // Kết nối realtime: khách vãng lai vẫn nhận tồn kho / sản phẩm, đã đăng nhập nhận thêm sự kiện riêng
  useRealtimeConnection(token);

  // Giỏ hàng vừa đổi trên thiết bị khác (App hoặc tab khác)
  useRealtimeEvent("cart_updated", () => {
    if (useAuthStore.getState().token) fetchCart().catch(() => {});
  });

  useRealtimeEvent("stock_updated", (e) => useCartStore.getState().applyStock(e.items));

  useRealtimeEvent("order_status_updated", (e) => {
    popup.info(e.message, { title: e.title, duration: 6000 });
  });

  useRealtimeEvent("account_locked", (e) => {
    useAuthStore.getState().logout();
    useCartStore.getState().resetLocal();
    navigate("/login");
    popup.alert({
      type: "danger",
      title: "Tài khoản đã bị khóa",
      message: e.reason ? `Lý do: ${e.reason}` : "Vui lòng liên hệ cửa hàng để được hỗ trợ.",
    });
  });

  return (
    <>
      <Header />
      <CartDrawer />
      <div className="Home_main">
        <Outlet />
      </div>
      <Footer />
    </>
  );
}

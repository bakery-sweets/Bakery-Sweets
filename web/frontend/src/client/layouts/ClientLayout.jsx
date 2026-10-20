import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import CartDrawer from "../components/CartDrawer";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";

export default function ClientLayout() {
  const token = useAuthStore((s) => s.token);
  const fetchCart = useCartStore((s) => s.fetchCart);

  // Đồng bộ giỏ hàng từ server mỗi khi có phiên đăng nhập
  useEffect(() => {
    if (token) fetchCart().catch(() => {});
  }, [token, fetchCart]);

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

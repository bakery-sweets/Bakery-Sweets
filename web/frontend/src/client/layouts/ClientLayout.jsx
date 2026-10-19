import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import CartDrawer from "../components/CartDrawer";

export default function ClientLayout() {
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

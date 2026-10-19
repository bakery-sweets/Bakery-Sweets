import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import CartDrawer from "../ui/CartDrawer";

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

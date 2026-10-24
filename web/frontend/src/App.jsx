import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// Client Imports
import ClientLayout from "./client/layouts/ClientLayout";
import Home from "./client/pages/Home";
import Products from "./client/pages/Products";
import Login from "./client/pages/Login";
import Register from "./client/pages/Register";
import ProductDetail from "./client/pages/ProductDetail";
import Receipt from "./client/pages/Receipt";
import Pay from "./client/pages/Pay";
import About from "./client/pages/About";

// Admin Imports
import AdminLogin from "./admin/pages/AdminLogin";
import AdminRoute from "./admin/components/AdminRoute";
import AdminLayout from "./admin/layouts/AdminLayout";
import Dashboard from "./admin/pages/Dashboard";
import ProductList from "./admin/pages/ProductList";
import ProductForm from "./admin/pages/ProductForm";
import OrderList from "./admin/pages/OrderList";
import UserList from "./admin/pages/UserList";
import Statistical from "./admin/pages/Statistical";
import ImportReceiptList from "./admin/pages/ImportReceiptList";
import PromotionList from "./admin/pages/PromotionList";
import { ADMIN_ONLY } from "./admin/access";

import GlobalPopup from "./components/common/GlobalPopup";

function App() {
  return (
    <BrowserRouter>
      <GlobalPopup />
      <Routes>
        {/* Nhóm trang Khách hàng (ClientLayout gồm Header & Footer của tiệm bánh) */}
        <Route element={<ClientLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/receipt" element={<Receipt />} />
          <Route path="/vouchers" element={<Navigate to="/" replace />} />
          <Route path="/pay" element={<Pay />} />
          <Route path="/search" element={<Navigate to="/products" replace />} />
        </Route>

        {/* Trang Đăng nhập Quản trị */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Nhóm trang Quản trị (Protected): admin và nhân viên (staff) */}
        <Route path="/admin" element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="orders" element={<OrderList />} />

            {/* Chỉ admin; nhân viên mở các trang này sẽ bị chuyển về Quản lý đơn hàng */}
            <Route element={<AdminRoute roles={ADMIN_ONLY} />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<ProductList />} />
              <Route path="products/add" element={<ProductForm />} />
              <Route path="products/edit/:id" element={<ProductForm />} />
              <Route path="imports" element={<ImportReceiptList />} />
              <Route path="vouchers" element={<PromotionList />} />
              <Route path="users" element={<UserList />} />
              <Route path="statistical" element={<Statistical />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

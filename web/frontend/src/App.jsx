import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// Client Imports
import ClientLayout from "./client/layouts/ClientLayout";
import Home from "./client/pages/Home";
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
import EmployeeList from "./admin/pages/EmployeeList";
import EmployeeForm from "./admin/pages/EmployeeForm";
import Statistical from "./admin/pages/Statistical";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Nhóm trang Khách hàng (ClientLayout gồm Header & Footer của tiệm bánh) */}
        <Route element={<ClientLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/receipt" element={<Receipt />} />
          <Route path="/pay" element={<Pay />} />
          <Route path="/search" element={<Navigate to="/" replace />} />
        </Route>

        {/* Trang Đăng nhập Quản trị */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Nhóm trang Quản trị (Protected) */}
        <Route path="/admin" element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<ProductList />} />
            <Route path="products/add" element={<ProductForm />} />
            <Route path="products/edit/:id" element={<ProductForm />} />
            <Route path="orders" element={<OrderList />} />
            <Route path="employees" element={<EmployeeList />} />
            <Route path="employees/add" element={<EmployeeForm />} />
            <Route path="employees/edit/:id" element={<EmployeeForm />} />
            <Route path="users" element={<UserList />} />
            <Route path="statistical" element={<Statistical />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

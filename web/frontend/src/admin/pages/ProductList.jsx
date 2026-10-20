import { useState } from "react";
import AdminHeader from "../components/AdminHeader";
import { Link } from "react-router-dom";

export default function ProductList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const categories = [
    { key: "all", label: "Tất Cả", count: 48 },
    { key: "Mousse", label: "Mousse Cake", count: 18 },
    { key: "Croissant", label: "Croissant & Pastry", count: 12 },
    { key: "Drink", label: "Trà & Thức Uống", count: 18 },
  ];

  const products = [
    {
      id: 1,
      name: "Tiramisu Mousse",
      frenchName: "Mascarpone & Espresso Italiano",
      category: "Mousse",
      sizes: [
        { name: "S (16cm)", price: "130.000 đ", stock: 15 },
        { name: "M (20cm)", price: "190.000 đ", stock: 10 },
      ],
      totalStock: 25,
      status: "Available",
      img: "/assets/Img/Mousse1.png",
    },
    {
      id: 2,
      name: "Fraise Rose Mousse",
      frenchName: "Dâu tây Đà Lạt & Hoa hồng Grasse",
      category: "Mousse",
      sizes: [
        { name: "S (16cm)", price: "135.000 đ", stock: 12 },
        { name: "M (20cm)", price: "195.000 đ", stock: 8 },
      ],
      totalStock: 20,
      status: "Available",
      img: "/assets/Img/Mousse2.png",
    },
    {
      id: 3,
      name: "Plain Butter Croissant",
      frenchName: "Bơ lạt Elle & Vire AOP 27 lớp",
      category: "Croissant",
      sizes: [
        { name: "Tiêu chuẩn", price: "35.000 đ", stock: 40 },
      ],
      totalStock: 40,
      status: "Available",
      img: "/assets/Img/croissant1.png",
    },
    {
      id: 4,
      name: "Dinosaur Almond Croissant",
      frenchName: "Hạnh nhân nướng giòn & kem Frangipane",
      category: "Croissant",
      sizes: [
        { name: "Tiêu chuẩn", price: "55.000 đ", stock: 25 },
      ],
      totalStock: 25,
      status: "Available",
      img: "/assets/Img/croissant2.png",
    },
    {
      id: 5,
      name: "Matcha Latte Cake",
      frenchName: "Matcha Uji Kyoto & Sữa tươi Pháp",
      category: "Mousse",
      sizes: [
        { name: "S (16cm)", price: "140.000 đ", stock: 0 },
        { name: "M (20cm)", price: "205.000 đ", stock: 0 },
      ],
      totalStock: 0,
      status: "Out of Stock",
      img: "/assets/Img/Mousse3.png",
    },
    {
      id: 6,
      name: "Peach Tea",
      frenchName: "Trà lài thượng hạng & đào tươi giòn",
      category: "Drink",
      sizes: [
        { name: "Ly 500ml", price: "35.000 đ", stock: 50 },
      ],
      totalStock: 50,
      status: "Available",
      img: "/assets/Img/drink1.png",
    },
  ];

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <>
      <AdminHeader />

      <div className="admin-page-container">
        {/* Header Row */}
        <div className="admin-page-header-row">
          <div className="admin-page-title-group">
            <h1>Thực Đơn Bánh &amp; Thức Uống</h1>
            <p>Quản lý danh mục 48+ món bánh ngọt Pháp &amp; bảng giá theo kích cỡ</p>
          </div>

          <div className="admin-page-actions">
            <button className="btn-pill-outline" type="button">
              <ion-icon name="download-outline"></ion-icon>
              <span>Xuất Menu</span>
            </button>
            <Link to="/admin/products/add" className="btn-pill-primary">
              <ion-icon name="add"></ion-icon>
              <span>Thêm Bánh Mới</span>
            </Link>
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="admin-filter-tabs">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategoryFilter(c.key)}
              className={`tab-pill-btn ${categoryFilter === c.key ? "active" : ""}`}
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>

        {/* Card Data Table */}
        <div className="admin-card-box">
          {/* Table Search Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "8px 16px", borderRadius: "9999px", border: "1px solid #f1f2f4", width: "320px" }}>
              <ion-icon name="search-outline" style={{ color: "#94a3b8", fontSize: "17px" }}></ion-icon>
              <input
                type="text"
                placeholder="Tìm tên món bánh, nguyên liệu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", width: "100%", color: "#1e293b", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ fontSize: "13px", color: "#8c9ba5", fontWeight: "600" }}>
              Hiển thị <span style={{ color: "#1e293b", fontWeight: "800" }}>{filtered.length}</span> món bánh
            </div>
          </div>

          <div className="admin-table-clean-wrapper">
            <table className="admin-table-clean">
              <thead>
                <tr>
                  <th style={{ width: "50px" }}>ẢNH</th>
                  <th>TÊN BÁNH / PHÂN LOẠI</th>
                  <th>DANH MỤC</th>
                  <th>ĐỊNH GIÁ SIZE &amp; TỒN KHO</th>
                  <th>TỔNG TỒN</th>
                  <th>TRẠNG THÁI</th>
                  <th style={{ textAlign: "right" }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <img
                        src={p.img}
                        alt={p.name}
                        onError={(e) => { e.target.src = "/assets/Img/Sweets1.png"; }}
                        style={{ width: "46px", height: "46px", borderRadius: "14px", objectFit: "cover", background: "#fff0f4" }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "14px" }}>{p.name}</div>
                      <div style={{ fontSize: "11.5px", color: "#8c9ba5", marginTop: "2px" }}>{p.frenchName}</div>
                    </td>
                    <td>
                      <span className="badge-pill pink" style={{ fontSize: "11px" }}>{p.category}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {p.sizes.map((s, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: "#f8fafc",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                              padding: "4px 8px",
                              fontSize: "11.5px",
                              fontWeight: "600",
                              color: "#334155",
                            }}
                          >
                            <span style={{ color: "#de5d7c", fontWeight: "700" }}>{s.name}</span>: {s.price}
                            <span style={{ color: "#8c9ba5", fontSize: "10.5px", marginLeft: "4px" }}>({s.stock})</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: "700", color: p.totalStock > 0 ? "#1e293b" : "#ef4444" }}>
                        {p.totalStock} cái
                      </span>
                    </td>
                    <td>
                      {p.status === "Available" ? (
                        <span className="badge-pill mint" style={{ fontSize: "11.5px" }}>
                          <span className="dot-status green"></span> Đang bán
                        </span>
                      ) : (
                        <span className="badge-pill amber" style={{ fontSize: "11.5px" }}>
                          <span className="dot-status orange"></span> Hết hàng
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <Link
                          to={`/admin/products/edit/${p.id}`}
                          className="btn-pill-outline"
                          style={{ padding: "5px 12px", fontSize: "12px" }}
                        >
                          Sửa
                        </Link>
                        <button
                          type="button"
                          className="btn-pill-outline"
                          style={{ padding: "5px 10px", fontSize: "12px", color: "#ef4444" }}
                          onClick={() => alert(`Xóa món: ${p.name}`)}
                        >
                          <ion-icon name="trash-outline"></ion-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f8f9fa", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ fontSize: "12.5px", color: "#8c9ba5" }}>
              Hiển thị 1 - {filtered.length} trên 48 sản phẩm
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className="tab-pill-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                &larr; Trước
              </button>
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  className={`tab-pill-btn ${currentPage === num ? "active" : ""}`}
                  onClick={() => setCurrentPage(num)}
                >
                  {num}
                </button>
              ))}
              <button
                className="tab-pill-btn"
                disabled={currentPage === 3}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, 3))}
                style={{ opacity: currentPage === 3 ? 0.5 : 1 }}
              >
                Sau &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

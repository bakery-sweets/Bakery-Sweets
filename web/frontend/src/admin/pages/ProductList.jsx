import { useCallback, useEffect, useState } from "react";
import AdminHeader from "../components/AdminHeader";
import { Link } from "react-router-dom";
import { adminProductsApi } from "../../api/admin";
import { clientProductsApi } from "../../api/client";
import { formatVND, imageUrl, apiErrorMessage, PRODUCT_STATUS } from "../../utils/format";
import popup from "../../utils/popup";

const PAGE_SIZE = 10;

export default function ProductList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [apiCategories, setApiCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [prod, cats] = await Promise.all([adminProductsApi.getAll(), clientProductsApi.getCategories()]);
      setProducts(prod.data);
      setApiCategories(cats.data);
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "Không tải được danh sách sản phẩm"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categories = [
    { key: "all", label: "Tất Cả", count: products.length },
    ...apiCategories.map((c) => ({
      key: c.category_id,
      label: c.category_name,
      count: products.filter((p) => p.category_id === c.category_id).length,
    })),
  ];

  const filtered = products.filter((p) => {
    const matchSearch = p.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category_id === categoryFilter;
    return matchSearch && matchCat;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleToggleStatus = async (p) => {
    const isDiscontinued = p.status === "Discontinued";
    const nextStatus = isDiscontinued ? "Available" : "Discontinued";

    const confirmed = await popup.confirm({
      title: isDiscontinued ? "Mở bán lại bánh?" : "Ngừng kinh doanh bánh?",
      message: isDiscontinued
        ? `Mở bán lại món bánh "${p.product_name}"?`
        : `Ngừng bán món bánh "${p.product_name}"?`,
      subtitle: isDiscontinued
        ? "Món sẽ hiển thị lại trên menu trực tuyến để khách hàng có thể đặt mua bình thường."
        : "Món sẽ chuyển sang trạng thái \"Ngừng kinh doanh\", không hiển thị cho khách nhưng bảo lưu toàn bộ lịch sử đơn hàng.",
      confirmText: isDiscontinued ? "Mở bán lại" : "Ngừng kinh doanh",
      cancelText: "Hủy bỏ",
      type: isDiscontinued ? "success" : "danger",
      icon: isDiscontinued ? "play" : "pause",
    });

    if (!confirmed) return;

    try {
      await adminProductsApi.update(p.product_id, { status: nextStatus });
      popup.success(
        isDiscontinued
          ? `Đã mở bán lại món "${p.product_name}" thành công!`
          : `Đã chuyển "${p.product_name}" sang trạng thái ngừng kinh doanh.`
      );
      await loadData();
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không thể cập nhật trạng thái sản phẩm"));
    }
  };

  return (
    <>
      <AdminHeader />

      <div className="admin-page-container">
        {/* Header Row */}
        <div className="admin-page-header-row">
          <div className="admin-page-title-group">
            <h1>Danh Mục Bánh</h1>
            <p>Quản lý danh mục bánh nhập khẩu &amp; bảng giá theo kích cỡ</p>
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
              onClick={() => { setCategoryFilter(c.key); setCurrentPage(1); }}
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
                placeholder="Tìm tên món bánh, mã sản phẩm..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", width: "100%", color: "#1e293b", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ fontSize: "13px", color: "#8c9ba5", fontWeight: "600" }}>
              Hiển thị <span style={{ color: "#1e293b", fontWeight: "800" }}>{filtered.length}</span> món bánh
            </div>
          </div>

          {error && (
            <div style={{ color: "#b91c1c", fontWeight: "600", marginBottom: "12px" }}>{error}</div>
          )}

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
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", color: "#8c9ba5" }}>
                      {loading ? "Đang tải..." : "Không có món bánh nào."}
                    </td>
                  </tr>
                )}
                {pageItems.map((p) => {
                  const totalStock = p.sizes.reduce((sum, sz) => sum + sz.stock_quantity, 0);
                  return (
                  <tr key={p.product_id}>
                    <td>
                      <img
                        src={imageUrl(p.image)}
                        alt={p.product_name}
                        onError={(e) => { e.target.src = "/assets/Img/Sweets1.png"; }}
                        style={{ width: "46px", height: "46px", borderRadius: "14px", objectFit: "cover", background: "#fff0f4" }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "14px" }}>{p.product_name}</div>
                      <div style={{ fontSize: "11.5px", color: "#8c9ba5", marginTop: "2px" }}>Mã SP: #{p.product_id}</div>
                    </td>
                    <td>
                      <span className="badge-pill pink" style={{ fontSize: "11px" }}>{p.category_name || "—"}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {p.sizes.map((s) => (
                          <span
                            key={s.id}
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
                            <span style={{ color: "#de5d7c", fontWeight: "700" }}>{s.size_name}</span>: {formatVND(s.price, " đ")}
                            <span style={{ color: "#8c9ba5", fontSize: "10.5px", marginLeft: "4px" }}>({s.stock_quantity})</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: "700", color: totalStock > 0 ? "#1e293b" : "#ef4444" }}>
                        {totalStock} cái
                      </span>
                    </td>
                    <td>
                      {p.status === "Available" ? (
                        <span className="badge-pill mint" style={{ fontSize: "11.5px" }}>
                          <span className="dot-status green"></span> {PRODUCT_STATUS[p.status] || "Đang bán"}
                        </span>
                      ) : p.status === "Discontinued" ? (
                        <span className="badge-pill" style={{ fontSize: "11.5px", background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
                          <span className="dot-status" style={{ background: "#94a3b8" }}></span> {PRODUCT_STATUS[p.status] || "Ngừng kinh doanh"}
                        </span>
                      ) : (
                        <span className="badge-pill amber" style={{ fontSize: "11.5px" }}>
                          <span className="dot-status orange"></span> {PRODUCT_STATUS[p.status] || p.status}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                        <Link
                          to={`/admin/products/edit/${p.product_id}`}
                          className="btn-pill-outline"
                          style={{ padding: "5px 12px", fontSize: "12px" }}
                        >
                          Sửa
                        </Link>
                        {p.status === "Discontinued" ? (
                          <button
                            type="button"
                            className="btn-pill-outline"
                            style={{
                              padding: "5px 10px",
                              fontSize: "12px",
                              color: "#059669",
                              borderColor: "#a7f3d0",
                              background: "#ecfdf5",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            title="Mở bán lại"
                            onClick={() => handleToggleStatus(p)}
                          >
                            <ion-icon name="play-circle-outline"></ion-icon>
                            <span>Mở bán</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-pill-outline"
                            style={{
                              padding: "5px 10px",
                              fontSize: "12px",
                              color: "#e11d48",
                              borderColor: "#fecdd3",
                              background: "#fff1f2",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            title="Ngừng bán món này"
                            onClick={() => handleToggleStatus(p)}
                          >
                            <ion-icon name="pause-circle-outline"></ion-icon>
                            <span>Ngừng bán</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f8f9fa", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ fontSize: "12.5px", color: "#8c9ba5" }}>
              Hiển thị {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} - {(page - 1) * PAGE_SIZE + pageItems.length} trên {filtered.length} sản phẩm
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className="tab-pill-btn"
                disabled={page === 1}
                onClick={() => setCurrentPage(Math.max(page - 1, 1))}
                style={{ opacity: page === 1 ? 0.5 : 1 }}
              >
                &larr; Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  className={`tab-pill-btn ${page === num ? "active" : ""}`}
                  onClick={() => setCurrentPage(num)}
                >
                  {num}
                </button>
              ))}
              <button
                className="tab-pill-btn"
                disabled={page === totalPages}
                onClick={() => setCurrentPage(Math.min(page + 1, totalPages))}
                style={{ opacity: page === totalPages ? 0.5 : 1 }}
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

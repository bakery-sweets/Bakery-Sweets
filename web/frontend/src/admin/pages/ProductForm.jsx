import { useState } from "react";
import AdminHeader from "../components/AdminHeader";
import { useNavigate, useParams, Link } from "react-router-dom";

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Danh mục kích thước chuẩn (bám sát bảng size trong DB)
  const defaultSizes = [
    { id: 1, name: "Size S (Mini - 12cm)" },
    { id: 2, name: "Size M (Tiêu chuẩn - 16cm)" },
    { id: 3, name: "Size L (Lớn - 20cm)" },
    { id: 4, name: "Size XL (Tiệc - 24cm)" },
  ];

  const [availableSizes, setAvailableSizes] = useState(defaultSizes);
  const [newSizeName, setNewSizeName] = useState("");
  const [showAddSizeModal, setShowAddSizeModal] = useState(false);

  // Form State bám sát bảng product & product_sizes trong createTable.sql
  const [formData, setFormData] = useState({
    name: isEdit ? "Chocolate Mousse" : "",
    category: isEdit ? "Mousse" : "Mousse",
    status: isEdit ? "Available" : "Available",
    
    // Kích thước chính (chế độ 1 size)
    selected_size: isEdit ? "2" : "2",
    price: isEdit ? "45000" : "45000",
    stock: isEdit ? "25" : "15",
    
    image: isEdit ? "/assets/Img/Mousse1.png" : "",
    expiration_date: isEdit ? "3 ngày từ ngày sản xuất" : "3 ngày ở nhiệt độ 2-5°C",
    storage_instructions: isEdit ? "Bảo quản ngăn mát tủ lạnh" : "Bảo quản ngăn mát tủ lạnh từ 2°C - 5°C",
    ingredients: isEdit ? "Chocolate đen 70%, kem tươi whipping cream, trứng gà, đường cát" : "",
    description: isEdit ? "Bánh mousse sô-cô-la ngọt ngào đậm vị, kết cấu mịn màng tan ngay trong miệng." : "",
    
    // Cấu hình nhiều kích cỡ (bảng product_sizes)
    enable_multi_size: isEdit ? false : false,
    sizes: [
      { size_id: 1, size_name: "Size S (Mini - 12cm)", enabled: true, price: "35000", stock: 20 },
      { size_id: 2, size_name: "Size M (Tiêu chuẩn - 16cm)", enabled: true, price: "45000", stock: 25 },
      { size_id: 3, size_name: "Size L (Lớn - 20cm)", enabled: false, price: "60000", stock: 10 },
      { size_id: 4, size_name: "Size XL (Tiệc - 24cm)", enabled: false, price: "85000", stock: 5 },
    ],
  });

  const handleSizeChange = (index, field, value) => {
    const updatedSizes = [...formData.sizes];
    updatedSizes[index][field] = value;
    setFormData({ ...formData, sizes: updatedSizes });
  };

  const handleAddNewSize = () => {
    if (!newSizeName.trim()) return;
    const newId = availableSizes.length + 1;
    const newSizeObj = { id: newId, name: newSizeName.trim() };
    
    setAvailableSizes([...availableSizes, newSizeObj]);
    setFormData({
      ...formData,
      sizes: [
        ...formData.sizes,
        { size_id: newId, size_name: newSizeName.trim(), enabled: true, price: "50000", stock: 10 }
      ]
    });
    setNewSizeName("");
    setShowAddSizeModal(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Nối API POST/PUT /api/products & /api/product_sizes tại đây sau này
    alert(isEdit ? "Cập nhật sản phẩm & kích thước thành công (Mock)!" : "Thêm bánh mới & cấu hình kích thước thành công (Mock)!");
    navigate("/admin/products");
  };

  return (
    <>
      <AdminHeader />
      <div className="admin-page-container">
        
        {/* Header Row */}
        <div className="admin-page-header-row" style={{ maxWidth: "960px", margin: "0 auto 24px" }}>
          <div className="admin-page-title-group">
            <h1>{isEdit ? "Chỉnh Sửa Món Bánh" : "Thêm Món Bánh Mới"}</h1>
            <p>Cấu hình thông số kỹ thuật, công thức nguyên liệu &amp; bảng giá kích cỡ</p>
          </div>

          <div className="admin-page-actions">
            <Link to="/admin/products" className="btn-pill-outline">
              <ion-icon name="arrow-back-outline"></ion-icon>
              <span>Quay Lại Thực Đơn</span>
            </Link>
          </div>
        </div>

        <div className="admin-card-box" style={{ maxWidth: "960px", margin: "0 auto" }}>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* 1. THÔNG TIN CƠ BẢN */}
            <div className="admin-grid-2" style={{ gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>Tên bánh ngọt *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Chocolate Mousse"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: "100%", padding: "11px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>Danh mục sản phẩm *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ width: "100%", padding: "11px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", background: "#fff" }}
                >
                  <option value="Mousse">Bánh Mousse</option>
                  <option value="Croissant">Bánh Croissant</option>
                  <option value="Drink">Đồ uống (Drink)</option>
                  <option value="Cupcake">Bánh Cupcake</option>
                  <option value="Tart">Bánh Tart trứng</option>
                </select>
              </div>
            </div>

            {/* 2. KHU VỰC CẤU HÌNH KÍCH THƯỚC (SIZE & PRICING) */}
            <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "700", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                    <ion-icon name="resize-outline" style={{ color: "#3b82f6", fontSize: "20px" }}></ion-icon>
                    Cấu hình kích thước bánh (Size) & Giá bán *
                  </h4>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Chọn kích thước hoặc mở bán nhiều kích cỡ bánh (Bảng <code>size</code> & <code>product_sizes</code>)
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "600", color: "#334155", cursor: "pointer", background: "#fff", padding: "6px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                    <input
                      type="checkbox"
                      checked={formData.enable_multi_size}
                      onChange={(e) => setFormData({ ...formData, enable_multi_size: e.target.checked })}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <span>Bán nhiều size (S / M / L / XL)</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowAddSizeModal(true)}
                    style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: "600", color: "#1a2639", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <ion-icon name="add-circle-outline" style={{ fontSize: "16px", color: "#10b981" }}></ion-icon>
                    <span>+ Thêm size mới</span>
                  </button>
                </div>
              </div>

              {/* Chế độ 1: Chọn 1 kích thước chính */}
              {!formData.enable_multi_size ? (
                <div className="admin-grid-3" style={{ gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                      Kích thước chọn bán *
                    </label>
                    <select
                      value={formData.selected_size}
                      onChange={(e) => setFormData({ ...formData, selected_size: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", background: "#fff" }}
                    >
                      {availableSizes.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                      Đơn giá bán (VNĐ) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="VD: 45000"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", background: "#fff" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                      Số lượng tồn kho ban đầu *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="VD: 25"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", background: "#fff" }}
                    />
                  </div>
                </div>
              ) : (
                /* Chế độ 2: Bảng cấu hình nhiều size (product_sizes) với cuộn ngang trên mobile */
                <div className="admin-table-responsive" style={{ border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "480px" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9", fontSize: "12px", color: "#475569" }}>
                        <th style={{ padding: "10px 14px" }}>Kích thước (Size)</th>
                        <th style={{ padding: "10px 14px", width: "100px", textAlign: "center" }}>Bật bán</th>
                        <th style={{ padding: "10px 14px" }}>Giá bán (VNĐ)</th>
                        <th style={{ padding: "10px 14px" }}>Số lượng kho</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.sizes.map((s, idx) => (
                        <tr key={s.size_id} style={{ borderBottom: "1px solid #f1f5f9", background: s.enabled ? "#fff" : "#f8fafc" }}>
                          <td style={{ padding: "10px 14px", fontWeight: "600", fontSize: "13px", color: s.enabled ? "#1e293b" : "#94a3b8" }}>
                            {s.size_name}
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={s.enabled}
                              onChange={(e) => handleSizeChange(idx, "enabled", e.target.checked)}
                              style={{ width: "18px", height: "18px", cursor: "pointer" }}
                            />
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <input
                              type="number"
                              disabled={!s.enabled}
                              value={s.price}
                              onChange={(e) => handleSizeChange(idx, "price", e.target.value)}
                              placeholder="Giá bán"
                              style={{ width: "100%", maxWidth: "160px", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", background: s.enabled ? "#fff" : "#e2e8f0" }}
                            />
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <input
                              type="number"
                              disabled={!s.enabled}
                              value={s.stock}
                              onChange={(e) => handleSizeChange(idx, "stock", e.target.value)}
                              placeholder="Tồn kho"
                              style={{ width: "100%", maxWidth: "120px", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", background: s.enabled ? "#fff" : "#e2e8f0" }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3. TRẠNG THÁI & HÌNH ẢNH */}
            <div className="admin-grid-2" style={{ gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>Trạng thái bán *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{ width: "100%", padding: "11px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", background: "#fff" }}
                >
                  <option value="Available">Available (Còn hàng mở bán)</option>
                  <option value="Out of Stock">Out of Stock (Tạm hết)</option>
                  <option value="Discontinued">Discontinued (Ngừng kinh doanh)</option>
                  <option value="Hidden">Hidden (Ẩn khỏi Website)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>Đường dẫn hình ảnh (URL / File path)</label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="VD: /assets/Img/Mousse1.png"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    style={{ flex: 1, padding: "11px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                  />
                  {formData.image && (
                    <img
                      src={formData.image}
                      alt="Preview"
                      style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1", flexShrink: 0 }}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 4. CHI TIẾT BẢO QUẢN & NGUYÊN LIỆU (THEO DATABASE SQL) */}
            <div className="admin-grid-2" style={{ gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>Hạn sử dụng</label>
                <input
                  type="text"
                  placeholder="VD: 3 ngày ở nhiệt độ 2-5°C"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                  style={{ width: "100%", padding: "11px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>Hướng dẫn bảo quản</label>
                <input
                  type="text"
                  placeholder="VD: Bảo quản ngăn mát tủ lạnh từ 2°C - 5°C"
                  value={formData.storage_instructions}
                  onChange={(e) => setFormData({ ...formData, storage_instructions: e.target.value })}
                  style={{ width: "100%", padding: "11px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>Thành phần nguyên liệu (Ingredients)</label>
              <input
                type="text"
                placeholder="VD: Bột mì nguyên cám, bơ Pháp cao cấp, socola đen 70%, kem béo whipping cream..."
                value={formData.ingredients}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                style={{ width: "100%", padding: "11px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>Mô tả sản phẩm</label>
              <textarea
                rows="3"
                placeholder="Nhập mô tả chi tiết giới thiệu hương vị bánh..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ width: "100%", padding: "11px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
              ></textarea>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
              <button type="submit" className="btn-pill-primary">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
                <span>{isEdit ? "Cập nhật sản phẩm & kích thước" : "Lưu bánh mới"}</span>
              </button>

              <Link to="/admin/products" className="btn-pill-outline">
                <ion-icon name="close-circle-outline"></ion-icon>
                <span>Hủy bỏ</span>
              </Link>
            </div>

          </form>
        </div>

        {/* MODAL THÊM KÍCH THƯỚC BÁNH MỚI */}
        {showAddSizeModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "16px" }}>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>Thêm kích cỡ bánh mới</h3>
              <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b" }}>Nhập tên kích cỡ (VD: Bento Cake 10cm, Bánh sinh nhật 2 tầng...)</p>
              
              <input
                type="text"
                placeholder="VD: Bento Cake (10cm)"
                value={newSizeName}
                onChange={(e) => setNewSizeName(e.target.value)}
                autoFocus
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", marginBottom: "18px", boxSizing: "border-box" }}
              />

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="admin-btn-default"
                  onClick={() => setShowAddSizeModal(false)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="admin-btn-accept"
                  onClick={handleAddNewSize}
                  disabled={!newSizeName.trim()}
                >
                  Xác nhận thêm
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

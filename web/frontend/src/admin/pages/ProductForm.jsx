import { useEffect, useState, useRef } from "react";
import AdminHeader from "../components/AdminHeader";
import { useNavigate, useParams, Link } from "react-router-dom";
import { adminProductsApi } from "../../api/admin";
import { clientProductsApi } from "../../api/client";
import { imageUrl, apiErrorMessage } from "../../utils/format";
import popup from "../../utils/popup";

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [categories, setCategories] = useState([]);
  // Backend chưa có API danh sách size nên lấy các size đang được dùng trong product_sizes
  const [availableSizes, setAvailableSizes] = useState([]);
  const [newSizeName, setNewSizeName] = useState("");
  const [showAddSizeModal, setShowAddSizeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Chọn ảnh từ máy tính
  const fileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      popup.warning("Vui lòng chọn tệp hình ảnh (PNG, JPG, WEBP, ...)", { title: "Tệp không hợp lệ" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      popup.warning("Dung lượng ảnh không được vượt quá 10MB.", { title: "Dung lượng quá lớn" });
      return;
    }

    // Hiển thị xem trước ảnh tức thì
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);

    setUploadingImage(true);
    try {
      const res = await adminProductsApi.uploadImage(file);
      const uploadedUrl = res.data?.url || res.url;
      setFormData((prev) => ({ ...prev, image: uploadedUrl }));
      popup.success("Đã tải ảnh lên máy chủ thành công!");
    } catch (err) {
      popup.error(apiErrorMessage(err, "Không thể tải ảnh lên máy chủ"));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Form State bám sát bảng product & product_sizes trong createTable.sql
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    status: "Available",

    // Kích thước chính (chế độ 1 size)
    selected_size: "",
    price: "",
    stock: "",

    image: "",
    expiration_date: "",
    storage_instructions: "",
    ingredients: "",
    description: "",

    // Cấu hình nhiều kích cỡ (bảng product_sizes)
    enable_multi_size: false,
    sizes: [],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, prods, product] = await Promise.all([
          clientProductsApi.getCategories(),
          adminProductsApi.getAll(),
          isEdit ? adminProductsApi.getById(id) : Promise.resolve(null),
        ]);

        const sizeNames = new Map();
        prods.data.forEach((pr) => pr.sizes.forEach((sz) => sizeNames.set(sz.size_id, sz.size_name)));
        const sizes = [...sizeNames.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([sizeId, name]) => ({ id: sizeId, name }));

        setCategories(cats.data);
        setAvailableSizes(sizes);

        if (product) {
          const pd = product.data;
          const first = pd.sizes[0];
          setFormData({
            name: pd.product_name,
            category_id: pd.category_id ?? "",
            status: pd.status,
            selected_size: first ? first.size_id : sizes[0]?.id ?? "",
            price: first ? Number(first.price) : "",
            stock: first ? first.stock_quantity : "",
            image: pd.image || "",
            expiration_date: pd.expiration_date || "",
            storage_instructions: pd.storage_instructions || "",
            ingredients: pd.ingredients || "",
            description: "",
            enable_multi_size: pd.sizes.length > 1,
            sizes: sizes.map((sz) => {
              const ps = pd.sizes.find((x) => x.size_id === sz.id);
              return {
                size_id: sz.id,
                size_name: sz.name,
                enabled: !!ps,
                price: ps ? Number(ps.price) : "",
                stock: ps ? ps.stock_quantity : "",
              };
            }),
          });
        } else {
          setFormData((f) => ({
            ...f,
            category_id: cats.data[0]?.category_id ?? "",
            selected_size: sizes[0]?.id ?? "",
            sizes: sizes.map((sz) => ({ size_id: sz.id, size_name: sz.name, enabled: false, price: "", stock: "" })),
          }));
        }
      } catch (err) {
        popup.error(apiErrorMessage(err, "Không tải được dữ liệu sản phẩm"));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, isEdit]);

  const handleSizeChange = (index, field, value) => {
    setFormData({
      ...formData,
      sizes: formData.sizes.map((sz, i) => (i === index ? { ...sz, [field]: value } : sz)),
    });
  };

  const handleAddNewSize = () => {
    popup.info("Tính năng tạo kích cỡ mới đang được cập nhật ở phiên bản tiếp theo.", {
      title: "Thông báo hệ thống",
    });
    setNewSizeName("");
    setShowAddSizeModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const sizes = formData.enable_multi_size
      ? formData.sizes
          .filter((sz) => sz.enabled)
          .map((sz) => ({ size_id: sz.size_id, price: Number(sz.price), stock_quantity: Number(sz.stock) || 0 }))
      : formData.selected_size
        ? [{ size_id: Number(formData.selected_size), price: Number(formData.price), stock_quantity: Number(formData.stock) || 0 }]
        : [];

    if (sizes.length === 0) {
      popup.warning("Vui lòng chọn ít nhất một kích thước và nhập giá bán cho bánh.", {
        title: "Chưa chọn kích thước",
      });
      return;
    }
    if (sizes.some((sz) => Number.isNaN(sz.price) || sz.price < 0)) {
      popup.warning("Giá bán của mỗi kích thước phải là số dương hợp lệ.", {
        title: "Giá bán không hợp lệ",
      });
      return;
    }

    // Bảng product không có cột mô tả nên trường description không được gửi lên
    const body = {
      product_name: formData.name.trim(),
      category_id: formData.category_id === "" ? null : Number(formData.category_id),
      status: formData.status,
      ingredients: formData.ingredients || null,
      expiration_date: formData.expiration_date || null,
      storage_instructions: formData.storage_instructions || null,
      image: formData.image || null,
      sizes,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await adminProductsApi.update(id, body);
        popup.success(`Đã cập nhật món bánh "${formData.name.trim()}" thành công!`);
      } else {
        await adminProductsApi.create(body);
        popup.success(`Đã thêm mới món bánh "${formData.name.trim()}" thành công!`);
      }
      navigate("/admin/products");
    } catch (err) {
      popup.error(apiErrorMessage(err, "Lưu sản phẩm thất bại"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AdminHeader />
      <div className="admin-page-container">
        
        {/* Header Row */}
        <div className="admin-page-header-row" style={{ maxWidth: "960px", margin: "0 auto 24px" }}>
          <div className="admin-page-title-group">
            <h1>{isEdit ? "Chỉnh Sửa Món Bánh" : "Thêm Món Bánh Mới"}</h1>
            <p>Cấu hình thông tin bánh nhập khẩu, hạn bảo quản &amp; bảng giá kích cỡ</p>
          </div>

          <div className="admin-page-actions">
            <Link to="/admin/products" className="btn-pill-outline">
              <ion-icon name="arrow-back-outline"></ion-icon>
              <span>Quay Lại Danh Mục</span>
            </Link>
          </div>
        </div>

        <div className="admin-card-box" style={{ maxWidth: "960px", margin: "0 auto" }}>

          {loading ? (
            <div style={{ textAlign: "center", color: "#8c9ba5", padding: "30px 0" }}>Đang tải...</div>
          ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* 1. THÔNG TIN CƠ BẢN */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
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
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  style={{ width: "100%", padding: "11px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", background: "#fff" }}
                >
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>Trạng thái kinh doanh *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{ width: "100%", padding: "11px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", background: "#fff" }}
                >
                  <option value="Available">Đang bán (Available)</option>
                  <option value="Out of Stock">Tạm hết hàng (Out of Stock)</option>
                  <option value="Discontinued">Ngừng kinh doanh (Discontinued)</option>
                  <option value="Hidden">Đang ẩn (Hidden)</option>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                    Hình ảnh sản phẩm *
                  </label>
                  {(formData.image || imagePreview) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, image: "" });
                        setImagePreview(null);
                      }}
                      style={{ background: "none", border: "none", color: "#e11d48", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>

                {/* Input chọn file ẩn */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                />

                {/* Khung tải ảnh & xem trước */}
                <div
                  style={{
                    border: "1.5px dashed #cbd5e1",
                    borderRadius: "12px",
                    padding: "12px",
                    background: "#f8fafc",
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Thumbnail Preview Box */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "10px",
                      background: "#ffffff",
                      border: "1.5px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      cursor: "pointer",
                      flexShrink: 0,
                      position: "relative",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                    }}
                    title="Bấm để chọn / đổi ảnh từ máy"
                  >
                    {imagePreview || formData.image ? (
                      <img
                        src={imagePreview || imageUrl(formData.image)}
                        alt="Preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/assets/Img/Sweets1.png";
                        }}
                      />
                    ) : (
                      <ion-icon name="image-outline" style={{ fontSize: "26px", color: "#94a3b8" }}></ion-icon>
                    )}

                    {uploadingImage && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(255,255,255,0.8)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ion-icon name="sync-outline" style={{ fontSize: "20px", color: "#de5d7c", animation: "spin 1s linear infinite" }}></ion-icon>
                      </div>
                    )}
                  </div>

                  {/* Nút Chọn ảnh từ máy & input đường dẫn */}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn-pill-primary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        style={{
                          padding: "6px 14px",
                          fontSize: "12px",
                          cursor: uploadingImage ? "not-allowed" : "pointer",
                          opacity: uploadingImage ? 0.7 : 1,
                        }}
                      >
                        <ion-icon name="cloud-upload-outline"></ion-icon>
                        <span>{uploadingImage ? "Đang tải ảnh lên..." : "Chọn ảnh từ máy"}</span>
                      </button>

                      <span style={{ fontSize: "11.5px", color: "#8c9ba5" }}>
                        JPG, PNG, WEBP (tối đa 10MB)
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="Hoặc nhập URL / file path (VD: /uploads/Drink/Tira_Latte.png)"
                      value={formData.image}
                      onChange={(e) => {
                        setFormData({ ...formData, image: e.target.value });
                        setImagePreview(null);
                      }}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "12.5px",
                        boxSizing: "border-box",
                        background: "#ffffff",
                        color: "#334155",
                      }}
                    />
                  </div>
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
              <button type="submit" className="btn-pill-primary" disabled={submitting}>
                <ion-icon name="checkmark-circle-outline"></ion-icon>
                <span>{isEdit ? "Cập nhật sản phẩm & kích thước" : "Lưu bánh mới"}</span>
              </button>

              <Link to="/admin/products" className="btn-pill-outline">
                <ion-icon name="close-circle-outline"></ion-icon>
                <span>Hủy bỏ</span>
              </Link>
            </div>

          </form>
          )}
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

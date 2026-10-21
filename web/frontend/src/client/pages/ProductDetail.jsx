import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useCartStore from '../../store/cartStore';
import { clientProductsApi } from '../../api/client';
import { formatVND, imageUrl, apiErrorMessage } from '../../utils/format';
import popup from '../../utils/popup';
import './ProductDetail.css';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const addToCart = useCartStore(state => state.addItem);

  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    setProduct(null);
    setLoadError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    Promise.all([
      clientProductsApi.getById(id),
      clientProductsApi.getAll()
    ])
      .then(([detailRes, allRes]) => {
        setProduct(detailRes.data);
        setSelectedSize(detailRes.data.sizes[0] ? String(detailRes.data.sizes[0].size_id) : '');
        setQuantity(1);
        setAllProducts(allRes.data.filter(p => p.sizes && p.sizes.length > 0));
      })
      .catch((err) => setLoadError(apiErrorMessage(err, 'Không tải được thông tin bánh.')));
  }, [id]);

  const sizes = product?.sizes || [];
  const currentSizeObj = sizes.find(s => String(s.size_id) === selectedSize);

  const handleAddToCart = async () => {
    if (!currentSizeObj) return;
    try {
      await addToCart(
        { product_id: product.product_id, product_name: product.product_name, image: imageUrl(product.image) },
        currentSizeObj,
        quantity
      );
      popup.success(`Đã thêm ${quantity}x "${product.product_name}" vào giỏ hàng!`);
    } catch (err) {
      popup.error(apiErrorMessage(err, 'Không thêm được vào giỏ hàng.'));
    }
  };

  // Mua ngay: Thêm vào giỏ hàng và chuyển ngay đến trang thanh toán
  const handleBuyNow = async () => {
    if (!currentSizeObj) return;
    try {
      await addToCart(
        { product_id: product.product_id, product_name: product.product_name, image: imageUrl(product.image) },
        currentSizeObj,
        quantity
      );
      if (!user) {
        navigate('/login');
        return;
      }
      navigate('/pay');
    } catch (err) {
      alert(apiErrorMessage(err, 'Không thể thực hiện mua ngay.'));
    }
  };

  // Helper lấy size mặc định/rẻ nhất cho sản phẩm gợi ý
  const cheapestSize = (item) => {
    if (!item.sizes || item.sizes.length === 0) return null;
    return [...item.sizes].sort((a, b) => Number(a.price) - Number(b.price))[0];
  };

  // Thêm nhanh vào giỏ hàng từ thẻ gợi ý
  const handleQuickAddToCart = async (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    const size = cheapestSize(item);
    if (!size) return;
    try {
      await addToCart(
        { product_id: item.product_id, product_name: item.product_name, image: imageUrl(item.image) },
        size,
        1
      );
      setAddedId(item.product_id);
      setTimeout(() => setAddedId(null), 1200);
    } catch (err) {
      alert(apiErrorMessage(err, 'Không thêm được vào giỏ hàng.'));
    }
  };

  // Thuật toán tự động gợi ý sản phẩm phù hợp nhất (kết hợp cùng loại bánh & khoảng giá tương đồng)
  const relatedProducts = useMemo(() => {
    if (!product || !allProducts.length) return [];
    const currentId = String(product.product_id);
    const currentCatId = product.category_id;
    const currentPrice = Number(product.min_price || (product.sizes?.[0]?.price ?? 0));

    // Lọc bỏ sản phẩm hiện tại
    const candidates = allProducts.filter(p => String(p.product_id) !== currentId);

    // Tính điểm gợi ý (Hybrid Recommendation Scoring):
    // 1. Cùng loại bánh: +100 điểm
    // 2. Chênh lệch giá: giá càng sát điểm càng cao (tối đa +50 điểm)
    const scored = candidates.map(p => {
      const pPrice = Number(p.min_price || (p.sizes?.[0]?.price ?? 0));
      const isSameCategory = p.category_id === currentCatId;
      const priceDiff = Math.abs(pPrice - currentPrice);

      // Điểm độ gần về giá: giảm 1 điểm cho mỗi 1.000₫ chênh lệch
      const priceProximityScore = Math.max(0, 50 - (priceDiff / 1000));
      const totalScore = (isSameCategory ? 100 : 0) + priceProximityScore;

      return {
        ...p,
        price: pPrice,
        priceDiff,
        isSameCategory,
        totalScore,
      };
    });

    // Sắp xếp tự động theo tổng điểm phù hợp cao nhất (ưu tiên cùng loại, giá gần nhất)
    return scored
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 8);
  }, [product, allProducts]);

  if (loadError) return <div style={{ padding: '60px', textAlign: 'center' }}>{loadError}</div>;
  if (!product) return <div style={{ padding: '60px', textAlign: 'center' }}>Đang tải...</div>;

  return (
    <div className="product-detail-page">
      <div className="product-detail-container">

        {/* HÌNH ẢNH SẢN PHẨM */}
        <div className="product-detail-img-box">
          <img
            src={imageUrl(product.image)}
            alt={product.product_name}
            className="product-detail-img"
            onError={(e) => { e.target.src = '/assets/Img/Sweets1.png'; }}
          />
        </div>

        {/* THÔNG TIN CHI TIẾT */}
        <div className="product-detail-info-box">
          <div className="product-detail-breadcrumbs">
            <Link to="/">Trang chủ</Link> &gt; <span>{product.category_name}</span>
          </div>

          <h1 className="product-detail-title">{product.product_name}</h1>
          <p className="product-detail-price">{formatVND(currentSizeObj?.price ?? product.min_price)}</p>

          {/* CHỌN KÍCH CỠ */}
          {sizes.length > 0 && (
            <div className="product-detail-size-section">
              <label className="product-detail-label">Chọn kích thước:</label>
              <div className="product-detail-size-options">
                {sizes.map(s => (
                  <button
                    key={s.size_id}
                    type="button"
                    className={`product-size-btn ${selectedSize === String(s.size_id) ? "active" : ""}`}
                    onClick={() => setSelectedSize(String(s.size_id))}
                  >
                    <span className="size-name">{s.size_name}</span>
                    <span className="size-extra">{formatVND(s.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CHỌN SỐ LƯỢNG */}
          <div className="product-detail-qty-section">
            <label className="product-detail-label">Số lượng:</label>
            <div className="product-detail-qty-control">
              <button
                type="button"
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              >
                -
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(prev => prev + 1)}
              >
                +
              </button>
            </div>
          </div>

          {/* NÚT HÀNH ĐỘNG: THÊM GIỎ HÀNG & MUA NGAY */}
          <div className="product-detail-actions-row">
            <button
              type="button"
              onClick={handleAddToCart}
              className="product-detail-add-btn"
              disabled={!currentSizeObj}
            >
              <ion-icon name="cart-outline" style={{ fontSize: '20px' }}></ion-icon>
              <span>Thêm vào giỏ hàng</span>
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              className="product-detail-buy-now-btn"
              disabled={!currentSizeObj}
            >
              <ion-icon name="flash-outline" style={{ fontSize: '19px' }}></ion-icon>
              <span>Mua ngay</span>
            </button>
          </div>

          {/* THÔNG TIN NGUYÊN LIỆU & BẢO QUẢN */}
          <div className="product-detail-extra-info">
            <div className="extra-info-item">
              <strong>Thành phần:</strong> {product.ingredients || '—'}
            </div>
            <div className="extra-info-item">
              <strong>Bảo quản:</strong> {product.storage_instructions || '—'}
            </div>
            <div className="extra-info-item">
              <strong>Hạn sử dụng:</strong> {product.expiration_date || '—'}
            </div>
          </div>

        </div>

      </div>

      {/* PHẦN GỢI Ý CÁC SẢN PHẨM KHÁC */}
      {relatedProducts.length > 0 && (
        <section className="related-products-section">
          <div className="related-header-wrap">
            <div className="related-header-text">
              <h2 className="related-title">Gợi ý sản phẩm tương tự</h2>
              <p className="related-subtitle">
                Các món bánh cùng loại và có mức giá tương đồng bạn có thể thích
              </p>
            </div>
          </div>

          <div className="related-products-grid">
            {relatedProducts.map((item) => (
              <div key={item.product_id} className="related-product-card">
                <Link to={`/product/${item.product_id}`} className="related-product-link">
                  <div className="related-product-img-wrap">
                    <img
                      src={imageUrl(item.image)}
                      alt={item.product_name}
                      className="related-product-img"
                      onError={(e) => {
                        e.target.src = '/assets/Img/Sweets1.png';
                      }}
                    />
                    <span className="related-category-tag">{item.category_name}</span>
                  </div>
                  <div className="related-product-info">
                    <h3 className="related-product-title">{item.product_name}</h3>
                    <div className="related-card-bottom">
                      <p className="related-product-price">{formatVND(item.price)}</p>
                      <button
                        type="button"
                        className={`related-cart-btn ${addedId === item.product_id ? 'added' : ''}`}
                        onClick={(e) => handleQuickAddToCart(e, item)}
                        title="Thêm vào giỏ hàng"
                      >
                        <ion-icon name={addedId === item.product_id ? "checkmark-circle" : "bag-add-outline"}></ion-icon>
                        <span className="cart-btn-text">
                          {addedId === item.product_id ? "Đã thêm!" : "Thêm vào giỏ"}
                        </span>
                      </button>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

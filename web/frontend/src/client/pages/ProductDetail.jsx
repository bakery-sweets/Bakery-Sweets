import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import useCartStore from '../../store/cartStore';
import { clientProductsApi } from '../../api/client';
import { formatVND, imageUrl, apiErrorMessage } from '../../utils/format';
import './ProductDetail.css';

export default function ProductDetail() {
  const { id } = useParams();
  const addToCart = useCartStore(state => state.addItem);

  const [product, setProduct] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setProduct(null);
    setLoadError('');
    clientProductsApi.getById(id)
      .then((res) => {
        setProduct(res.data);
        setSelectedSize(res.data.sizes[0] ? String(res.data.sizes[0].size_id) : '');
        setQuantity(1);
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
      alert('Đã thêm sản phẩm vào giỏ hàng thành công!');
    } catch (err) {
      alert(apiErrorMessage(err, 'Không thêm được vào giỏ hàng.'));
    }
  };

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

          {/* NÚT THÊM GIỎ HÀNG */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="product-detail-add-btn"
            disabled={!currentSizeObj}
          >
            <ion-icon name="cart-outline" style={{ fontSize: '20px' }}></ion-icon>
            <span>Thêm vào giỏ hàng</span>
          </button>

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
    </div>
  );
}

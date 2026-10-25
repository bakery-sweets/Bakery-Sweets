import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useCartStore from '../../store/cartStore';
import { clientProductsApi } from '../../api/client';
import { formatVND, imageUrl, apiErrorMessage } from '../../utils/format';
import { sizeStock, productStock, isLowStock, cheapestAvailableSize } from '../../utils/stock';
import popup from '../../utils/popup';
import './ProductDetail.css';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const addToCart = useCartStore(state => state.addItem);
  const quantityInCart = useCartStore(state => state.quantityInCart);
  // Theo dõi giỏ để số lượng còn thêm được cập nhật ngay sau khi thêm
  useCartStore(state => state.items);

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
        // Mặc định chọn size đầu tiên còn hàng
        const firstSize = detailRes.data.sizes.find(s => sizeStock(s) > 0) || detailRes.data.sizes[0];
        setSelectedSize(firstSize ? String(firstSize.size_id) : '');
        setQuantity(1);
        setAllProducts(allRes.data.filter(p => p.sizes && p.sizes.length > 0));
      })
      .catch((err) => setLoadError(apiErrorMessage(err, 'Không tải được thông tin bánh.')));
  }, [id]);

  const sizes = product?.sizes || [];
  const currentSizeObj = sizes.find(s => String(s.size_id) === selectedSize);
  const soldOut = productStock(product) <= 0;
  const currentStock = sizeStock(currentSizeObj);
  // Số bánh còn thêm được = tồn kho của size trừ số đã nằm trong giỏ
  const maxAddable = currentSizeObj
    ? Math.max(0, currentStock - quantityInCart(product.product_id, currentSizeObj.size_id))
    : 0;
  const canAdd = maxAddable > 0;

  // Đổi size thì đưa số lượng về 1
  useEffect(() => {
    setQuantity(1);
  }, [selectedSize]);

  const handleAddToCart = async () => {
    if (!canAdd) return;
    try {
      await addToCart(
        { product_id: product.product_id, product_name: product.product_name, image: imageUrl(product.image) },
        currentSizeObj,
        quantity
      );
      setQuantity(1);
      popup.success(`Đã thêm ${quantity}x "${product.product_name}" vào giỏ hàng!`);
    } catch (err) {
      popup.error(apiErrorMessage(err, 'Không thêm được vào giỏ hàng.'));
    }
  };

  // Mua ngay: Thêm vào giỏ hàng và chuyển ngay đến trang thanh toán
  // (đã lấy hết số bánh còn lại vào giỏ thì chuyển thẳng tới thanh toán)
  const handleBuyNow = async () => {
    if (!currentSizeObj || currentStock <= 0) return;
    try {
      if (canAdd) {
        await addToCart(
          { product_id: product.product_id, product_name: product.product_name, image: imageUrl(product.image) },
          currentSizeObj,
          quantity
        );
      }
      if (!user) {
        navigate('/login');
        return;
      }
      navigate('/pay');
    } catch (err) {
      popup.error(apiErrorMessage(err, 'Không thể thực hiện mua ngay.'));
    }
  };

  // Thêm nhanh vào giỏ hàng từ thẻ gợi ý
  const handleQuickAddToCart = async (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    const size = cheapestAvailableSize(item);
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
      popup.error(apiErrorMessage(err, 'Không thêm được vào giỏ hàng.'));
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
            <Link to="/">Trang chủ</Link> &gt; {product.category_id ? (
              <Link to={`/products?category=${product.category_id}`}>{product.category_name}</Link>
            ) : (
              <span>{product.category_name}</span>
            )}
          </div>

          <h1 className="product-detail-title">{product.product_name}</h1>
          <p className="product-detail-price">{formatVND(currentSizeObj?.price ?? product.min_price)}</p>
          {soldOut ? (
            <p className="product-detail-stock-alert sold-out">
              <ion-icon name="close-circle-outline"></ion-icon>
              Tạm hết hàng
            </p>
          ) : currentStock <= 0 ? (
            <p className="product-detail-stock-alert sold-out">
              <ion-icon name="close-circle-outline"></ion-icon>
              Size này tạm hết hàng, bạn chọn size khác nhé
            </p>
          ) : isLowStock(currentStock) ? (
            <p className="product-detail-stock-alert low">
              <ion-icon name="flame-outline"></ion-icon>
              Sắp hết hàng, chỉ còn {currentStock} bánh
            </p>
          ) : null}

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
                    disabled={sizeStock(s) <= 0}
                  >
                    <span className="size-name">{s.size_name}</span>
                    <span className="size-extra">{sizeStock(s) > 0 ? formatVND(s.price) : 'Hết hàng'}</span>
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
                disabled={!canAdd || quantity <= 1}
                aria-label="Giảm số lượng"
              >
                <ion-icon name="remove-outline"></ion-icon>
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(prev => Math.min(maxAddable, prev + 1))}
                disabled={!canAdd || quantity >= maxAddable}
                title={canAdd && quantity >= maxAddable ? 'Đã đạt số bánh còn lại' : undefined}
                aria-label="Tăng số lượng"
              >
                <ion-icon name="add-outline"></ion-icon>
              </button>
            </div>
            {!soldOut && currentStock > 0 && !canAdd && (
              <p className="product-detail-qty-note">Bạn đã thêm hết số bánh còn lại của size này vào giỏ hàng.</p>
            )}
          </div>

          {/* NÚT HÀNH ĐỘNG: THÊM GIỎ HÀNG & MUA NGAY */}
          <div className="product-detail-actions-row">
            <button
              type="button"
              onClick={handleAddToCart}
              className="product-detail-add-btn"
              disabled={!canAdd}
            >
              <ion-icon name="cart-outline" style={{ fontSize: '20px' }}></ion-icon>
              <span>Thêm vào giỏ hàng</span>
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              className="product-detail-buy-now-btn"
              disabled={!currentSizeObj || currentStock <= 0}
            >
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
                    {productStock(item) <= 0 && <p className="related-product-stock">Tạm hết hàng</p>}
                    <div className="related-card-bottom">
                      <p className="related-product-price">{formatVND(item.price)}</p>
                      <button
                        type="button"
                        className={`related-cart-btn ${addedId === item.product_id ? 'added' : ''}`}
                        onClick={(e) => handleQuickAddToCart(e, item)}
                        disabled={productStock(item) <= 0}
                        title={productStock(item) <= 0 ? 'Tạm hết hàng' : 'Thêm vào giỏ hàng'}
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

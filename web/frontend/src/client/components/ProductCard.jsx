import { useState } from 'react';
import { Link } from 'react-router-dom';
import useCartStore from '../../store/cartStore';
import { formatVND, imageUrl, apiErrorMessage } from '../../utils/format';
import { cheapestAvailableSize } from '../../utils/stock';
import popup from '../../utils/popup';
import './ProductCard.css';

// Thẻ bánh dùng chung cho trang chủ & trang sản phẩm
export default function ProductCard({ product }) {
  const { addItem } = useCartStore();
  const [added, setAdded] = useState(false);
  // Thêm nhanh dùng size rẻ nhất còn hàng; không còn size nào thì món đã hết hàng
  const quickSize = cheapestAvailableSize(product);
  const soldOut = !quickSize;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    try {
      await addItem(
        {
          product_id: product.product_id,
          product_name: product.product_name,
          image: imageUrl(product.image),
        },
        quickSize,
        1
      );
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
      popup.success(`Đã thêm "${product.product_name}" vào giỏ hàng!`);
    } catch (err) {
      popup.error(apiErrorMessage(err, 'Không thêm được vào giỏ hàng.'));
    }
  };

  return (
    <div className="home-product-card">
      <Link to={`/product/${product.product_id}`} className="home-product-link">
        <div className="home-product-img-wrap">
          <img
            src={imageUrl(product.image)}
            alt={product.product_name}
            className="home-product-img"
            onError={(e) => {
              e.target.src = '/assets/Img/Sweets1.png';
            }}
          />
          <span className="product-category-tag">{product.category_name}</span>
        </div>
        <div className="home-product-info">
          <div className="home-product-header-block">
            <h3 className="home-product-title">{product.product_name}</h3>
            {(product.ingredients || product.description) && (
              <p className="home-product-desc" title={product.ingredients || product.description}>
                {product.ingredients || product.description}
              </p>
            )}
          </div>
          <div className="home-product-footer-block">
            {soldOut && <p className="home-product-stock out-of-stock">Tạm hết hàng</p>}
            <div className="product-card-bottom">
              <p className="home-product-price">{formatVND(product.min_price)}</p>
              <button
                type="button"
                className={`product-expand-cart-btn ${added ? 'added' : ''}`}
                onClick={handleAddToCart}
                disabled={soldOut}
                title={soldOut ? 'Tạm hết hàng' : 'Thêm vào giỏ hàng'}
              >
                <ion-icon name={added ? 'checkmark-circle' : 'bag-add-outline'}></ion-icon>
                <span className="cart-btn-text">{added ? 'Đã thêm!' : 'Thêm vào giỏ'}</span>
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

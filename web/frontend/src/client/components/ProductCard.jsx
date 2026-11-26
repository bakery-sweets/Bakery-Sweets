import { useState } from 'react';
import { Link } from 'react-router-dom';
import useCartStore from '../../store/cartStore';
import { formatVND, imageUrl, apiErrorMessage } from '../../utils/format';
import { cheapestAvailableSize, productStock, isLowStock } from '../../utils/stock';
import { hasDeal, cardPrice, dealTagText } from '../../utils/deal';
import popup from '../../utils/popup';
import './ProductCard.css';

// Thẻ bánh dùng chung cho trang chủ & trang sản phẩm.
// anchorId + onOpenDetail(anchorId, product): trang danh sách truyền vào để lưu ngữ cảnh trước khi
// sang trang chi tiết (nút "Tiếp tục mua hàng" / Back sẽ cuộn về đúng thẻ có id = anchorId).
export default function ProductCard({ product, anchorId, onOpenDetail }) {
  const { addItem } = useCartStore();
  const [added, setAdded] = useState(false);
  // Thêm nhanh dùng size rẻ nhất còn hàng; không còn size nào thì món đã hết hàng
  const cheapestSize = cheapestAvailableSize(product);
  // Size rẻ nhất không được giảm nhưng size khác đang giảm (VD: chỉ size M khuyến mãi):
  // thẻ hiện giá của size đang giảm để khớp với nhãn khuyến mãi, và nút thêm nhanh thêm đúng size đó
  // cardPrice dùng chung với sắp xếp / lọc giá ở trang Thực đơn để thứ tự khớp với giá hiển thị
  const dealSize = cardPrice(product).size;
  const showDealSize = !!dealSize;
  const quickSize = showDealSize ? dealSize : cheapestSize;
  const soldOut = !quickSize;
  const totalStock = productStock(product);
  const dealTag = dealTagText(product);

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

  // Ctrl/Cmd/Shift/Alt + click mở tab mới, trang danh sách vẫn ở nguyên chỗ nên không lưu ngữ cảnh
  const handleOpenDetail = (e) => {
    if (!onOpenDetail || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    onOpenDetail(anchorId, product);
  };

  return (
    <div className="home-product-card" id={anchorId}>
      <Link
        to={`/product/${product.product_id}`}
        className="home-product-link"
        state={onOpenDetail ? { fromList: true } : undefined}
        onClick={handleOpenDetail}
      >
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
          {/* Nhãn khuyến mãi ghi kèm size được giảm (chỉ tính size còn hàng) để khách không hiểu nhầm mọi size đều giảm */}
          {dealTag && (
            <span className="product-deal-tag" title={`Khuyến mãi ${dealTag}`}>
              <ion-icon name="pricetag"></ion-icon>
              <span className="product-deal-tag-text">Khuyến mãi {dealTag}</span>
            </span>
          )}
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
            {soldOut ? (
              <p className="home-product-stock out-of-stock">Tạm hết hàng</p>
            ) : isLowStock(totalStock) ? (
              <p className="home-product-stock low-stock">
                <ion-icon name="flame-outline"></ion-icon>
                Sắp hết · còn {totalStock} bánh
              </p>
            ) : null}
            <div className="product-card-bottom">
              {showDealSize ? (
                <p className="home-product-price">
                  {formatVND(dealSize.price)}
                  <span className="home-product-price-old">{formatVND(dealSize.original_price)}</span>
                  <span className="home-product-price-size">{dealSize.size_name}</span>
                </p>
              ) : (
                <p className="home-product-price">
                  {formatVND(product.min_price)}
                  {hasDeal(product.min_price, product.min_original_price) && (
                    <span className="home-product-price-old">{formatVND(product.min_original_price)}</span>
                  )}
                </p>
              )}
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

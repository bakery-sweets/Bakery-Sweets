import useCartStore from "../../store/cartStore";
import { useNavigate } from "react-router-dom";
import { formatVND, apiErrorMessage } from "../../utils/format";
import popup from "../../utils/popup";
import { dealLabel, hasDeal } from "../../utils/deal";
import "./CartDrawer.css";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty, totalCost } = useCartStore();
  const navigate = useNavigate();

  // Khách chưa đăng nhập vẫn thanh toán được: trang thanh toán cho tự nhập thông tin người đặt
  const handleCheckout = () => {
    closeCart();
    navigate("/pay");
  };

  const run = (action) => action().catch((err) => popup.error(apiErrorMessage(err, "Không cập nhật được giỏ hàng.")));

  if (!isOpen) return null;

  return (
    <>
      <div className="blur-overlay" onClick={closeCart}></div>
      <div className="shopping-cart open">
        <div className="cart-header">
          <h2>Giỏ hàng</h2>
          <button onClick={closeCart}><ion-icon name="close-outline"></ion-icon></button>
        </div>
        <div className="cart-items">
          {items.length === 0 ? (
            <p className="empty-cart">Giỏ hàng của bạn đang trống</p>
          ) : items.map((item) => (
            <div className="cart-item" key={`${item.product_id}-${item.size_id}`}>
              <img
                src={item.image}
                alt={item.product_name}
                width={60}
                height={75}
                onError={(e) => { e.target.onerror = null; e.target.src = '/assets/Img/Sweets1.png'; }}
              />
              <div className="cart-item-details">
                <p>{item.product_name} - {item.size_name}</p>
                {hasDeal(item.price, item.original_price) && (
                  <span className="cart-item-deal">
                    Khuyến mãi {dealLabel(item.discount_percentage)}
                  </span>
                )}
                <div className="qty-controls">
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => run(() => updateQty(item.product_id, item.size_id, Math.max(1, item.quantity - 1)))}
                    disabled={item.quantity <= 1}
                    aria-label="Giảm số lượng"
                  >
                    <ion-icon name="remove-outline"></ion-icon>
                  </button>
                  <span className="qty-val">{item.quantity}</span>
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => run(() => updateQty(item.product_id, item.size_id, item.quantity + 1))}
                    disabled={item.stock_quantity != null && item.quantity >= item.stock_quantity}
                    title={item.stock_quantity != null && item.quantity >= item.stock_quantity ? "Đã đạt số bánh còn lại" : undefined}
                    aria-label="Tăng số lượng"
                  >
                    <ion-icon name="add-outline"></ion-icon>
                  </button>
                </div>
                {/* Thành tiền của dòng (đổi theo số lượng) + đơn giá để khách biết giá 1 cái */}
                <div className="cart-item-price">
                  <span className="cart-item-unit">
                    {hasDeal(item.price, item.original_price) && (
                      <s className="cart-item-unit-old">{formatVND(item.original_price)}</s>
                    )}
                    {formatVND(item.price)} × {item.quantity}
                  </span>
                  <strong className="cart-item-total">{formatVND(item.price * item.quantity)}</strong>
                </div>
              </div>
              <button className="remove-btn" onClick={() => run(() => removeItem(item.product_id, item.size_id))}>
                <ion-icon name="trash-outline"></ion-icon>
              </button>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Tổng cộng:</span>
              <strong>{formatVND(totalCost())}</strong>
            </div>
            <button className="checkout-btn" onClick={handleCheckout}>Thanh toán</button>
          </div>
        )}
      </div>
    </>
  );
}

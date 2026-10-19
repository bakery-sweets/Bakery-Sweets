import useCartStore from "../../store/cartStore";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import "./CartDrawer.css";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty, totalCost } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleCheckout = () => {
    closeCart();
    if (!user) { navigate("/login"); return; }
    navigate("/pay");
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="blur-overlay" onClick={closeCart}></div>
      <div className="shopping-cart open">
        <div className="cart-header">
          <h2>Shopping Cart</h2>
          <button onClick={closeCart}><ion-icon name="close-outline"></ion-icon></button>
        </div>
        <div className="cart-items">
          {items.length === 0 ? (
            <p className="empty-cart">Your cart is empty</p>
          ) : items.map((item) => (
            <div className="cart-item" key={`${item.product_id}-${item.size_id}`}>
              <img src={item.image} alt={item.product_name} width={60} height={75} />
              <div className="cart-item-details">
                <p>{item.product_name} - {item.size_name}</p>
                <div className="qty-controls">
                  <button onClick={() => updateQty(item.product_id, item.size_id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQty(item.product_id, item.size_id, item.quantity + 1)}>+</button>
                </div>
                <p>{(item.price * item.quantity).toLocaleString("vi-VN")} VND</p>
              </div>
              <button className="remove-btn" onClick={() => removeItem(item.product_id, item.size_id)}>
                <ion-icon name="trash-outline"></ion-icon>
              </button>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total:</span>
              <strong>{totalCost().toLocaleString("vi-VN")} VND</strong>
            </div>
            <button className="checkout-btn" onClick={handleCheckout}>Checkout</button>
          </div>
        )}
      </div>
    </>
  );
}

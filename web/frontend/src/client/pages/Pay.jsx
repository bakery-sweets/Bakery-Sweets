import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import './Pay.css';

export default function Pay() {
  const items = useCartStore(state => state.items);
  const clearCart = useCartStore(state => state.clearCart);
  const navigate = useNavigate();

  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    phone: '',
    address: '',
    city: 'TP. Hồ Chí Minh',
    note: '',
    paymentMethod: 'COD'
  });

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingFee = total > 0 ? 2.50 : 0;
  const finalTotal = total + shippingFee;

  const handlePay = (e) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Giỏ hàng của bạn đang trống!");
      return;
    }
    alert("Đặt hàng & thanh toán thành công! Mã đơn: DH" + Math.floor(Math.random() * 9000 + 1000));
    clearCart();
    navigate('/receipt');
  };

  return (
    <div className="pay-page-wrapper">
      <div className="pay-container">
        
        <h1 className="pay-main-title">Thanh toán & Đặt hàng</h1>

        {items.length === 0 ? (
          <div className="pay-empty-cart">
            <p>Giỏ hàng của bạn hiện đang trống.</p>
            <Link to="/" className="pay-back-shop-btn">Tiếp tục mua bánh ngọt</Link>
          </div>
        ) : (
          <form onSubmit={handlePay} className="pay-layout-grid">
            
            {/* CỘT TRÁI: THÔNG TIN GIAO HÀNG */}
            <div className="pay-shipping-box">
              <h2 className="pay-section-title">1. Thông tin người nhận bánh</h2>
              
              <div className="pay-form-group">
                <label>Họ và tên người nhận *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="VD: Nguyễn Văn A"
                  value={shippingInfo.name}
                  onChange={e => setShippingInfo({...shippingInfo, name: e.target.value})}
                />
              </div>

              <div className="pay-form-group">
                <label>Số điện thoại nhận bánh *</label>
                <input 
                  type="tel" 
                  required 
                  placeholder="VD: 0901234567"
                  value={shippingInfo.phone}
                  onChange={e => setShippingInfo({...shippingInfo, phone: e.target.value})}
                />
              </div>

              <div className="pay-form-group">
                <label>Địa chỉ nhận bánh cụ thể *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                  value={shippingInfo.address}
                  onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})}
                />
              </div>

              <div className="pay-form-group">
                <label>Ghi chú đơn hàng (Thời gian giao, yêu cầu nến/viết chữ...)</label>
                <textarea 
                  rows="3"
                  placeholder="VD: Giao vào lúc 15h chiều, tặng kèm nến số 25..."
                  value={shippingInfo.note}
                  onChange={e => setShippingInfo({...shippingInfo, note: e.target.value})}
                ></textarea>
              </div>

              <h2 className="pay-section-title" style={{ marginTop: '24px' }}>2. Phương thức thanh toán</h2>
              <div className="pay-method-options">
                <label className={`pay-method-card ${shippingInfo.paymentMethod === 'COD' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="COD" 
                    checked={shippingInfo.paymentMethod === 'COD'}
                    onChange={e => setShippingInfo({...shippingInfo, paymentMethod: e.target.value})}
                  />
                  <div>
                    <strong>Thanh toán tiền mặt khi nhận bánh (COD)</strong>
                    <span>Nhận bánh và kiểm tra trước khi trả tiền</span>
                  </div>
                </label>

                <label className={`pay-method-card ${shippingInfo.paymentMethod === 'VNPay' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="VNPay" 
                    checked={shippingInfo.paymentMethod === 'VNPay'}
                    onChange={e => setShippingInfo({...shippingInfo, paymentMethod: e.target.value})}
                  />
                  <div>
                    <strong>Chuyển khoản QR / VNPay / MoMo</strong>
                    <span>Quét mã QR thanh toán nhanh</span>
                  </div>
                </label>
              </div>
            </div>

            {/* CỘT PHẢI: TỔNG KẾT ĐƠN HÀNG */}
            <div className="pay-summary-box">
              <h2 className="pay-section-title">Chi tiết giỏ hàng ({items.length} món)</h2>
              
              <div className="pay-items-list">
                {items.map((item, i) => (
                  <div key={i} className="pay-item-row">
                    <img 
                      src={`/assets/Img/${item.image || 'Mousse1.png'}`} 
                      alt={item.name} 
                      className="pay-item-img"
                      onError={e => { e.target.src = '/assets/Img/Sweets1.png'; }}
                    />
                    <div className="pay-item-details">
                      <h4 className="pay-item-name">{item.name}</h4>
                      {item.size && <span className="pay-item-size">Size: {item.size}</span>}
                      <span className="pay-item-qty">SL: {item.quantity} x ${item.price.toFixed(2)}</span>
                    </div>
                    <div className="pay-item-total">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pay-cost-calc">
                <div className="cost-line">
                  <span>Tiền bánh:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="cost-line">
                  <span>Phí giao hàng:</span>
                  <span>${shippingFee.toFixed(2)}</span>
                </div>
                <div className="cost-line grand-total">
                  <span>Tổng thanh toán:</span>
                  <span className="total-amount">${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <button type="submit" className="pay-submit-btn">
                Xác nhận đặt hàng & Thanh toán
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}

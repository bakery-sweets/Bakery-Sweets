import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import './ProductDetail.css';

const mockProduct = {
  id: 1,
  name: 'Chocolate Mousse',
  price: 12.99,
  image: 'Mousse1.png',
  category: 'Bánh Mousse',
  description: 'Bánh mousse sô-cô-la ngọt ngào đậm vị, kết cấu mịn màng tan ngay trong miệng. Được làm từ socola đen 70% và kem whipping tươi cao cấp từ Pháp.',
  ingredients: 'Socola đen nguyên chất, kem whipping, đường cát, trứng gà sạch, gelatin thực vật.',
  storage: 'Bảo quản ngăn mát tủ lạnh từ 2°C - 5°C. Dùng ngon nhất trong vòng 3 ngày.'
};

const mockSizes = [
  { id: 1, size_name: 'Size S (12cm)', extra_price: 0 },
  { id: 2, size_name: 'Size M (16cm)', extra_price: 3.50 },
  { id: 3, size_name: 'Size L (20cm)', extra_price: 7.00 },
];

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToCart = useCartStore(state => state.addItem);
  
  const [product] = useState(mockProduct);
  const [sizes] = useState(mockSizes);
  const [selectedSize, setSelectedSize] = useState('1');
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    const sizeObj = sizes.find(s => s.id === parseInt(selectedSize));
    const extra = sizeObj ? sizeObj.extra_price : 0;
    
    addToCart({
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price + extra,
      size: sizeObj ? sizeObj.size_name : '',
      quantity
    });
    alert('Đã thêm sản phẩm vào giỏ hàng thành công!');
  };

  if (!product) return <div style={{ padding: '60px', textAlign: 'center' }}>Đang tải...</div>;

  const currentSizeObj = sizes.find(s => s.id === parseInt(selectedSize));
  const currentPrice = product.price + (currentSizeObj ? currentSizeObj.extra_price : 0);

  return (
    <div className="product-detail-page">
      <div className="product-detail-container">
        
        {/* HÌNH ẢNH SẢN PHẨM */}
        <div className="product-detail-img-box">
          <img 
            src={`/assets/Img/${product.image || 'Mousse1.png'}`} 
            alt={product.name} 
            className="product-detail-img"
            onError={(e) => { e.target.src = '/assets/Img/Sweets1.png'; }}
          />
        </div>

        {/* THÔNG TIN CHI TIẾT */}
        <div className="product-detail-info-box">
          <div className="product-detail-breadcrumbs">
            <Link to="/">Trang chủ</Link> &gt; <span>{product.category}</span>
          </div>

          <h1 className="product-detail-title">{product.name}</h1>
          <p className="product-detail-price">${currentPrice.toFixed(2)}</p>
          <p className="product-detail-desc">{product.description}</p>

          {/* CHỌN KÍCH CỠ */}
          {sizes.length > 0 && (
            <div className="product-detail-size-section">
              <label className="product-detail-label">Chọn kích thước:</label>
              <div className="product-detail-size-options">
                {sizes.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={`product-size-btn ${selectedSize === String(s.id) ? "active" : ""}`}
                    onClick={() => setSelectedSize(String(s.id))}
                  >
                    <span className="size-name">{s.size_name}</span>
                    {s.extra_price > 0 && (
                      <span className="size-extra">+${s.extra_price.toFixed(2)}</span>
                    )}
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
          >
            <ion-icon name="cart-outline" style={{ fontSize: '20px' }}></ion-icon>
            <span>Thêm vào giỏ hàng</span>
          </button>

          {/* THÔNG TIN NGUYÊN LIỆU & BẢO QUẢN */}
          <div className="product-detail-extra-info">
            <div className="extra-info-item">
              <strong>Thành phần:</strong> {product.ingredients}
            </div>
            <div className="extra-info-item">
              <strong>Bảo quản:</strong> {product.storage}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

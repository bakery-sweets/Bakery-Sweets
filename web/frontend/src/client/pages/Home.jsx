import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const CATEGORIES = ['ALL', 'MOUSSE', 'CROISSANT', 'DRINK'];
const BANNERS = ['/assets/Img/banner1.jpg', '/assets/Img/banner2.jpg'];

// Mock data
const mockProducts = [
  { id: 1, name: 'Chocolate Mousse', price: 12.99, image: 'Mousse1.png', category: 'MOUSSE' },
  { id: 2, name: 'Butter Croissant', price: 4.50, image: 'croissant1.png', category: 'CROISSANT' },
  { id: 3, name: 'Strawberry Drink', price: 5.99, image: 'drink1.png', category: 'DRINK' },
  { id: 4, name: 'Matcha Cake', price: 15.00, image: 'Mousse2.png', category: 'MOUSSE' },
  { id: 5, name: 'Almond Croissant', price: 5.20, image: 'croissant2.png', category: 'CROISSANT' },
  { id: 6, name: 'Peach Tea Drink', price: 4.80, image: 'drink2.png', category: 'DRINK' },
  { id: 7, name: 'Mango Mousse', price: 13.50, image: 'Mousse3.png', category: 'MOUSSE' },
  { id: 8, name: 'Chocolate Croissant', price: 5.50, image: 'croissant3.png', category: 'CROISSANT' },
];

export default function Home() {
  const [category, setCategory] = useState('ALL');
  const [page, setPage] = useState(1);
  const [currentBanner, setCurrentBanner] = useState(0);
  const totalPages = 1;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % BANNERS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const products = category === 'ALL' ? mockProducts : mockProducts.filter(p => p.category === category);

  return (
    <div className="home-page-wrapper">
      {/* BANNER SLIDER RESPONSIVE */}
      <div className="home-banner-container">
        {BANNERS.map((banner, idx) => (
          <img
            key={idx}
            src={banner}
            alt={`Banner ${idx + 1}`}
            className={`home-banner-img ${currentBanner === idx ? "active" : ""}`}
          />
        ))}
      </div>

      {/* NỘI DUNG SẢN PHẨM */}
      <div className="home-content-container">
        {/* DANH MỤC CATEGORIES */}
        <div className="home-categories-wrapper">
          <ul className="home-category-nav">
            {CATEGORIES.map((cat, i) => (
              <React.Fragment key={cat}>
                <li className="home-cat-item">
                  <button
                    type="button"
                    className={`home-cat-btn ${category === cat ? "active" : ""}`}
                    onClick={() => { setCategory(cat); setPage(1); }}
                  >
                    {cat}
                  </button>
                </li>
                {i < CATEGORIES.length - 1 && (
                  <span className="home-cat-divider">/</span>
                )}
              </React.Fragment>
            ))}
          </ul>
        </div>

        {/* LƯỚI SẢN PHẨM RESPONSIVE (2 CỘT MOBILE, 3 CỘT IPAD, 4 CỘT DESKTOP) */}
        {products.length === 0 ? (
          <div className="home-no-products">Không tìm thấy sản phẩm nào!</div>
        ) : (
          <div className="home-product-grid">
            {products.map(product => (
              <div key={product.id} className="home-product-card">
                <Link to={`/product/${product.id}`} className="home-product-link">
                  <div className="home-product-img-wrap">
                    <img 
                      src={`/assets/Img/${product.image || 'Mousse1.png'}`} 
                      alt={product.name} 
                      className="home-product-img"
                      onError={(e) => { e.target.src = '/assets/Img/Sweets1.png'; }}
                    />
                  </div>
                  <div className="home-product-info">
                    <h3 className="home-product-title">{product.name}</h3>
                    <p className="home-product-price">${product.price.toFixed(2)}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* PHÂN TRANG */}
        {totalPages > 1 && (
          <div className="home-pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`home-page-num ${page === p ? "active" : ""}`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

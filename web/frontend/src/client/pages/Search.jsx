import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Search.css';

const mockProducts = [
  { id: 1, name: 'Chocolate Mousse', price: 12.99, image: 'Mousse1.png', category: 'MOUSSE' },
  { id: 2, name: 'Butter Croissant', price: 4.50, image: 'croissant1.png', category: 'CROISSANT' },
  { id: 3, name: 'Strawberry Drink', price: 5.99, image: 'drink1.png', category: 'DRINK' },
  { id: 4, name: 'Matcha Cake', price: 15.00, image: 'Mousse2.png', category: 'MOUSSE' },
  { id: 5, name: 'Almond Croissant', price: 5.20, image: 'croissant2.png', category: 'CROISSANT' },
  { id: 6, name: 'Peach Tea Drink', price: 4.80, image: 'drink2.png', category: 'DRINK' },
];

export default function Search() {
  const [term, setTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [results, setResults] = useState(mockProducts);
  const [searched, setSearched] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearched(true);
    const filtered = mockProducts.filter(p => {
      const matchName = p.name.toLowerCase().includes(term.toLowerCase());
      const matchCat = category === 'all' || p.category === category;
      const matchMin = !minPrice || p.price >= parseFloat(minPrice);
      const matchMax = !maxPrice || p.price <= parseFloat(maxPrice);
      return matchName && matchCat && matchMin && matchMax;
    });
    setResults(filtered);
  };

  return (
    <div className="search-page-wrapper">
      <div className="search-container">
        
        <h1 className="search-title">Tìm kiếm sản phẩm nâng cao</h1>

        {/* BỘ LỌC TÌM KIẾM RESPONSIVE */}
        <form onSubmit={handleSearch} className="search-filter-card">
          <div className="search-inputs-grid">
            <div className="search-field">
              <label>Tên bánh ngọt</label>
              <input 
                type="text" 
                placeholder="Nhập tên bánh..." 
                value={term} 
                onChange={e => setTerm(e.target.value)} 
              />
            </div>

            <div className="search-field">
              <label>Danh mục</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="all">Tất cả danh mục</option>
                <option value="MOUSSE">Mousse</option>
                <option value="CROISSANT">Croissant</option>
                <option value="DRINK">Đồ uống</option>
              </select>
            </div>

            <div className="search-field">
              <label>Giá từ ($)</label>
              <input 
                type="number" 
                placeholder="Min" 
                value={minPrice} 
                onChange={e => setMinPrice(e.target.value)} 
              />
            </div>

            <div className="search-field">
              <label>Giá đến ($)</label>
              <input 
                type="number" 
                placeholder="Max" 
                value={maxPrice} 
                onChange={e => setMaxPrice(e.target.value)} 
              />
            </div>
          </div>

          <div className="search-btn-wrap">
            <button type="submit" className="search-action-btn">
              <ion-icon name="search-outline"></ion-icon>
              <span>Tìm kiếm bánh</span>
            </button>
          </div>
        </form>

        {/* KẾT QUẢ TÌM KIẾM */}
        <div className="search-results-section">
          <h2 className="search-results-count">
            Kết quả tìm kiếm ({results.length} sản phẩm)
          </h2>

          {results.length === 0 ? (
            <div className="search-no-result">Không tìm thấy món bánh phù hợp với tiêu chí lọc của bạn.</div>
          ) : (
            <div className="search-product-grid">
              {results.map(product => (
                <div key={product.id} className="search-product-card">
                  <Link to={`/product/${product.id}`} className="search-product-link">
                    <div className="search-img-wrap">
                      <img 
                        src={`/assets/Img/${product.image || 'Mousse1.png'}`} 
                        alt={product.name} 
                        onError={e => { e.target.src = '/assets/Img/Sweets1.png'; }}
                      />
                    </div>
                    <div className="search-card-info">
                      <h3>{product.name}</h3>
                      <p className="search-price">${product.price.toFixed(2)}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

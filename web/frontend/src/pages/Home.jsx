import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import './Home.css';

const CATEGORIES = [
  { id: 'ALL', name: 'Tất cả bánh', icon: 'grid-outline' },
  { id: 'MOUSSE', name: 'Mousse', icon: 'ice-cream-outline' },
  { id: 'CROISSANT', name: 'Croissant', icon: 'restaurant-outline' },
  { id: 'DRINK', name: 'Đồ uống', icon: 'cafe-outline' },
];

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
  { id: 9, name: 'Berry Mousse', price: 11.50, image: 'Mousse1.png', category: 'MOUSSE' },
  { id: 10, name: 'Cheese Croissant', price: 4.90, image: 'croissant1.png', category: 'CROISSANT' },
  { id: 11, name: 'Matcha Latte Drink', price: 5.20, image: 'drink1.png', category: 'DRINK' },
  { id: 12, name: 'Tiramisu Mousse', price: 14.00, image: 'Mousse2.png', category: 'MOUSSE' },
];

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  // Cart store & added notification
  const { addItem } = useCartStore();
  const [addedId, setAddedId] = useState(null);

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(
      {
        product_id: product.id,
        product_name: product.name,
        image: `/assets/Img/${product.image || 'Mousse1.png'}`,
      },
      {
        size_id: 1,
        size_name: 'Tiêu chuẩn',
        price: product.price,
      },
      1
    );
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1200);
  };

  // Filter states
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [category, setCategory] = useState('ALL');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Pagination & Banner
  const [page, setPage] = useState(1);
  const [currentBanner, setCurrentBanner] = useState(0);

  // Sync search input if URL search param changes
  useEffect(() => {
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
    }
  }, [urlSearch]);

  // Banner slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % BANNERS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    return mockProducts
      .filter((p) => {
        const matchesName = p.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
        const matchesCat = category === 'ALL' || p.category === category;
        const matchesMinPrice = minPrice === '' || p.price >= parseFloat(minPrice);
        const matchesMaxPrice = maxPrice === '' || p.price <= parseFloat(maxPrice);
        return matchesName && matchesCat && matchesMinPrice && matchesMaxPrice;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [searchTerm, category, minPrice, maxPrice, sortBy]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setCategory('ALL');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('default');
    setSearchParams({});
    setPage(1);
  };

  const handlePricePreset = (min, max) => {
    setMinPrice(min);
    setMaxPrice(max);
    setPage(1);
  };

  return (
    <div className="home-page-wrapper">
      {/* BANNER SLIDER */}
      <div className="home-banner-container">
        {BANNERS.map((banner, idx) => (
          <img
            key={idx}
            src={banner}
            alt={`Banner ${idx + 1}`}
            className={`home-banner-img ${currentBanner === idx ? 'active' : ''}`}
          />
        ))}
      </div>

      {/* KHUNG NỘI DUNG CHÍNH (SIDEBAR TRÁI + LIST SẢN PHẨM PHẢI) */}
      <div className="home-content-container">
        {/* NÚT BẬT BỘ LỌC TRÊN MOBILE */}
        <div className="mobile-filter-bar">
          <button
            type="button"
            className="mobile-filter-toggle-btn"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          >
            <ion-icon name="options-outline"></ion-icon>
            <span>{mobileFilterOpen ? 'Ẩn bộ lọc' : 'Bộ lọc tìm kiếm nâng cao'}</span>
          </button>
          <span className="mobile-results-count">
            {filteredProducts.length} sản phẩm
          </span>
        </div>

        <div className="home-layout-row">
          {/* CỘT BÊN TRÁI: BỘ LỌC TÌM KIẾM NÂNG CAO */}
          <aside className={`home-filter-sidebar ${mobileFilterOpen ? 'open' : ''}`}>
            <div className="filter-card">
              <div className="filter-card-header">
                <div className="filter-card-title">
                  <ion-icon name="funnel-outline"></ion-icon>
                  <span>Tìm kiếm nâng cao</span>
                </div>
                <button
                  type="button"
                  className="filter-reset-btn"
                  onClick={handleResetFilters}
                  title="Đặt lại tất cả bộ lọc"
                >
                  <ion-icon name="refresh-outline"></ion-icon>
                  <span>Đặt lại</span>
                </button>
              </div>

              {/* 1. TÌM THEO TÊN BÁNH */}
              <div className="filter-group">
                <label className="filter-label">
                  <ion-icon name="search-outline"></ion-icon>
                  Tên bánh
                </label>
                <div className="filter-input-wrap">
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="Nhập tên bánh..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="filter-clear-input"
                      onClick={() => setSearchTerm('')}
                    >
                      <ion-icon name="close-circle"></ion-icon>
                    </button>
                  )}
                </div>
              </div>

              {/* 2. LỌC THEO DANH MỤC */}
              <div className="filter-group">
                <label className="filter-label">
                  <ion-icon name="albums-outline"></ion-icon>
                  Danh mục sản phẩm
                </label>
                <div className="filter-category-list">
                  {CATEGORIES.map((cat) => {
                    const count =
                      cat.id === 'ALL'
                        ? mockProducts.length
                        : mockProducts.filter((p) => p.category === cat.id).length;
                    const isActive = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`filter-category-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setCategory(cat.id);
                          setPage(1);
                        }}
                      >
                        <span className="cat-name">
                          <ion-icon name={cat.icon}></ion-icon>
                          {cat.name}
                        </span>
                        <span className="cat-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. KHOẢNG GIÁ */}
              <div className="filter-group">
                <label className="filter-label">
                  <ion-icon name="pricetag-outline"></ion-icon>
                  Khoảng giá ($)
                </label>
                <div className="price-inputs-row">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    className="filter-input price-input"
                    value={minPrice}
                    onChange={(e) => {
                      setMinPrice(e.target.value);
                      setPage(1);
                    }}
                  />
                  <span className="price-separator">-</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    className="filter-input price-input"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>

                {/* Phím tắt giá nhanh */}
                <div className="price-preset-chips">
                  <button
                    type="button"
                    className={`price-chip ${minPrice === '' && maxPrice === '5' ? 'active' : ''}`}
                    onClick={() => handlePricePreset('', '5')}
                  >
                    Dưới $5
                  </button>
                  <button
                    type="button"
                    className={`price-chip ${minPrice === '5' && maxPrice === '10' ? 'active' : ''}`}
                    onClick={() => handlePricePreset('5', '10')}
                  >
                    $5 - $10
                  </button>
                  <button
                    type="button"
                    className={`price-chip ${minPrice === '10' && maxPrice === '' ? 'active' : ''}`}
                    onClick={() => handlePricePreset('10', '')}
                  >
                    Trên $10
                  </button>
                </div>
              </div>

              {/* 4. SẮP XẾP */}
              <div className="filter-group">
                <label className="filter-label">
                  <ion-icon name="swap-vertical-outline"></ion-icon>
                  Sắp xếp theo
                </label>
                <select
                  className="filter-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="default">Mặc định</option>
                  <option value="price-asc">Giá: Thấp đến cao</option>
                  <option value="price-desc">Giá: Cao đến thấp</option>
                  <option value="name-asc">Tên: A → Z</option>
                </select>
              </div>
            </div>
          </aside>

          {/* CỘT BÊN PHẢI: DANH SÁCH SẢN PHẨM */}
          <main className="home-main-products">
            {/* THANH THỐNG KÊ KẾT QUẢ & TIÊU ĐỀ */}
            <div className="products-header-bar">
              <div className="products-header-left">
                <h2 className="products-header-title">
                  {category === 'ALL'
                    ? 'Tất cả bánh tươi hôm nay'
                    : `Bánh ${CATEGORIES.find((c) => c.id === category)?.name || category}`}
                </h2>
                <span className="products-count-badge">
                  {filteredProducts.length} món
                </span>
              </div>

              {/* Tag lọc đang áp dụng */}
              {(searchTerm || category !== 'ALL' || minPrice || maxPrice || sortBy !== 'default') && (
                <div className="active-filters-chips">
                  {searchTerm && (
                    <span className="active-filter-tag">
                      Từ khóa: "{searchTerm}"
                      <button onClick={() => setSearchTerm('')}>×</button>
                    </span>
                  )}
                  {category !== 'ALL' && (
                    <span className="active-filter-tag">
                      {category}
                      <button onClick={() => setCategory('ALL')}>×</button>
                    </span>
                  )}
                  {(minPrice || maxPrice) && (
                    <span className="active-filter-tag">
                      Giá: ${minPrice || '0'} - ${maxPrice || '∞'}
                      <button onClick={() => { setMinPrice(''); setMaxPrice(''); }}>×</button>
                    </span>
                  )}
                  <button className="clear-all-tags-btn" onClick={handleResetFilters}>
                    Xóa tất cả
                  </button>
                </div>
              )}
            </div>

            {/* LƯỚI SẢN PHẨM */}
            {filteredProducts.length === 0 ? (
              <div className="home-no-products">
                <ion-icon name="search-outline" className="no-result-icon"></ion-icon>
                <h3>Không tìm thấy món bánh nào!</h3>
                <p>Hãy thử tìm với từ khóa hoặc điều chỉnh khoảng giá khác.</p>
                <button
                  type="button"
                  className="reset-search-btn"
                  onClick={handleResetFilters}
                >
                  Xem tất cả bánh
                </button>
              </div>
            ) : (
              <div className="home-product-grid">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="home-product-card">
                    <Link to={`/product/${product.id}`} className="home-product-link">
                      <div className="home-product-img-wrap">
                        <img
                          src={`/assets/Img/${product.image || 'Mousse1.png'}`}
                          alt={product.name}
                          className="home-product-img"
                          onError={(e) => {
                            e.target.src = '/assets/Img/Sweets1.png';
                          }}
                        />
                        <span className="product-category-tag">{product.category}</span>
                      </div>
                      <div className="home-product-info">
                        <h3 className="home-product-title">{product.name}</h3>
                        <div className="product-card-bottom">
                          <p className="home-product-price">${product.price.toFixed(2)}</p>
                          <button
                            type="button"
                            className={`product-expand-cart-btn ${addedId === product.id ? 'added' : ''}`}
                            onClick={(e) => handleAddToCart(e, product)}
                            title="Thêm vào giỏ hàng"
                          >
                            <ion-icon name={addedId === product.id ? "checkmark-circle" : "bag-add-outline"}></ion-icon>
                            <span className="cart-btn-text">
                              {addedId === product.id ? "Đã thêm!" : "Thêm vào giỏ"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

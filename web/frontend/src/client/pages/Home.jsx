import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useCartStore from '../../store/cartStore';
import { clientProductsApi } from '../../api/client';
import { formatVND, imageUrl, apiErrorMessage } from '../../utils/format';
import './Home.css';

const CATEGORY_ICONS = ['ice-cream-outline', 'restaurant-outline', 'cafe-outline', 'pizza-outline'];

const BANNERS = ['/assets/Img/banner1.jpg', '/assets/Img/banner2.jpg'];

// Size rẻ nhất của món, dùng cho nút "Thêm vào giỏ" nhanh ở trang chủ
const cheapestSize = (product) =>
  product.sizes.reduce((min, s) => (!min || Number(s.price) < Number(min.price) ? s : min), null);

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  // Cart store & added notification
  const { addItem } = useCartStore();
  const [addedId, setAddedId] = useState(null);

  // Dữ liệu sản phẩm & danh mục từ API
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([{ id: 'ALL', name: 'Tất cả bánh', icon: 'grid-outline' }]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    Promise.all([clientProductsApi.getAll(), clientProductsApi.getCategories()])
      .then(([productRes, categoryRes]) => {
        setProducts(
          productRes.data
            .filter((p) => p.sizes.length > 0)
            .map((p) => ({ ...p, price: Number(p.min_price) }))
        );
        setCategories([
          { id: 'ALL', name: 'Tất cả bánh', icon: 'grid-outline' },
          ...categoryRes.data.map((c, idx) => ({
            id: c.category_id,
            name: c.category_name,
            icon: CATEGORY_ICONS[idx % CATEGORY_ICONS.length],
          })),
        ]);
      })
      .catch((err) => setLoadError(apiErrorMessage(err, 'Không tải được danh sách bánh.')))
      .finally(() => setLoading(false));
  }, []);

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    const size = cheapestSize(product);
    try {
      await addItem(
        {
          product_id: product.product_id,
          product_name: product.product_name,
          image: imageUrl(product.image),
        },
        size,
        1
      );
      setAddedId(product.product_id);
      setTimeout(() => setAddedId(null), 1200);
    } catch (err) {
      alert(apiErrorMessage(err, 'Không thêm được vào giỏ hàng.'));
    }
  };

  // Filter states
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [searchInput, setSearchInput] = useState(urlSearch);
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
    setSearchTerm(urlSearch);
    setSearchInput(urlSearch);
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
    return products
      .filter((p) => {
        const matchesName = p.product_name.toLowerCase().includes(searchTerm.toLowerCase().trim());
        const matchesCat = category === 'ALL' || p.category_id === category;
        const matchesMinPrice = minPrice === '' || p.price >= parseFloat(minPrice);
        const matchesMaxPrice = maxPrice === '' || p.price <= parseFloat(maxPrice);
        return matchesName && matchesCat && matchesMinPrice && matchesMaxPrice;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'name-asc') return a.product_name.localeCompare(b.product_name);
        return 0;
      });
  }, [products, searchTerm, category, minPrice, maxPrice, sortBy]);

  const categoryName = (id) => categories.find((c) => c.id === id)?.name || id;

  // Xử lý tìm kiếm khi ấn Enter hoặc bấm kính lúp
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const query = searchInput.trim();
    setSearchTerm(query);
    setPage(1);
    if (query) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('search', query);
        return next;
      });
    } else {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('search');
        return next;
      });
    }
  };

  // Xóa từ khóa tìm kiếm
  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('search');
      return next;
    });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput('');
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
                <form onSubmit={handleSearchSubmit} className="filter-input-wrap">
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="Nhập tên bánh..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      className="filter-clear-input"
                      onClick={handleClearSearch}
                      title="Xóa từ khóa"
                    >
                      <ion-icon name="close-circle"></ion-icon>
                    </button>
                  )}
                  <button
                    type="submit"
                    className="filter-search-btn"
                    title="Tìm kiếm"
                    aria-label="Tìm kiếm"
                  >
                    <ion-icon name="search-outline"></ion-icon>
                  </button>
                </form>
              </div>

              {/* 2. LỌC THEO DANH MỤC */}
              <div className="filter-group">
                <label className="filter-label">
                  <ion-icon name="albums-outline"></ion-icon>
                  Danh mục sản phẩm
                </label>
                <div className="filter-category-list">
                  {categories.map((cat) => {
                    const count =
                      cat.id === 'ALL'
                        ? products.length
                        : products.filter((p) => p.category_id === cat.id).length;
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
                  Khoảng giá (₫)
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
                    className={`price-chip ${minPrice === '' && maxPrice === '50000' ? 'active' : ''}`}
                    onClick={() => handlePricePreset('', '50000')}
                  >
                    Dưới 50k
                  </button>
                  <button
                    type="button"
                    className={`price-chip ${minPrice === '50000' && maxPrice === '150000' ? 'active' : ''}`}
                    onClick={() => handlePricePreset('50000', '150000')}
                  >
                    50k - 150k
                  </button>
                  <button
                    type="button"
                    className={`price-chip ${minPrice === '150000' && maxPrice === '' ? 'active' : ''}`}
                    onClick={() => handlePricePreset('150000', '')}
                  >
                    Trên 150k
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
                    : categoryName(category)}
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
                      <button onClick={handleClearSearch}>×</button>
                    </span>
                  )}
                  {category !== 'ALL' && (
                    <span className="active-filter-tag">
                      {categoryName(category)}
                      <button onClick={() => setCategory('ALL')}>×</button>
                    </span>
                  )}
                  {(minPrice || maxPrice) && (
                    <span className="active-filter-tag">
                      Giá: {minPrice ? formatVND(minPrice) : '0₫'} - {maxPrice ? formatVND(maxPrice) : '∞'}
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
            {loading ? (
              <div className="home-no-products">
                <h3>Đang tải danh sách bánh...</h3>
              </div>
            ) : loadError ? (
              <div className="home-no-products">
                <h3>{loadError}</h3>
              </div>
            ) : filteredProducts.length === 0 ? (
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
                  <div key={product.product_id} className="home-product-card">
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
                        <h3 className="home-product-title">{product.product_name}</h3>
                        <div className="product-card-bottom">
                          <p className="home-product-price">{formatVND(product.price)}</p>
                          <button
                            type="button"
                            className={`product-expand-cart-btn ${addedId === product.product_id ? 'added' : ''}`}
                            onClick={(e) => handleAddToCart(e, product)}
                            title="Thêm vào giỏ hàng"
                          >
                            <ion-icon name={addedId === product.product_id ? "checkmark-circle" : "bag-add-outline"}></ion-icon>
                            <span className="cart-btn-text">
                              {addedId === product.product_id ? "Đã thêm!" : "Thêm vào giỏ"}
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

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clientProductsApi } from '../../api/client';
import ProductCard from '../components/ProductCard';
import { formatVND, apiErrorMessage } from '../../utils/format';
import './Products.css';

const CATEGORY_ICONS = ['ice-cream-outline', 'restaurant-outline', 'cafe-outline', 'pizza-outline'];

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  // Danh mục lấy từ URL (?category=id) để trang chủ có thể dẫn thẳng tới một danh mục
  const category = searchParams.get('category') ? Number(searchParams.get('category')) : 'ALL';

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

  // Filter states
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 8; // 4 sản phẩm / hàng x 2 hàng = 8 sản phẩm mỗi trang

  // Sync search input if URL search param changes
  useEffect(() => {
    setSearchTerm(urlSearch);
    setSearchInput(urlSearch);
  }, [urlSearch]);

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

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const validPage = Math.min(Math.max(1, page), totalPages);

  const paginatedProducts = useMemo(() => {
    const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, validPage]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === validPage) return;
    setPage(newPage);
    const target = document.querySelector('.products-header-bar') || document.querySelector('.products-page-wrapper');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (validPage <= 3) {
      return [1, 2, 3, 4, '...', totalPages];
    }
    if (validPage >= totalPages - 2) {
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', validPage - 1, validPage, validPage + 1, '...', totalPages];
  };

  const categoryName = (id) => categories.find((c) => c.id === id)?.name || id;

  const setCategory = (id) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id === 'ALL') next.delete('category');
      else next.set('category', id);
      return next;
    });

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
    setMinPrice('');
    setMaxPrice('');
    setSortBy('default');
    setSearchParams({});
    setPage(1);
  };

  const handlePricePreset = (min, max) => {
    if (minPrice === min && maxPrice === max) {
      setMinPrice('');
      setMaxPrice('');
    } else {
      setMinPrice(min);
      setMaxPrice(max);
    }
    setPage(1);
  };

  return (
    <div className="products-page-wrapper">
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
                    placeholder="Từ"
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
                    placeholder="Đến"
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
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
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
                      <button onClick={() => { setCategory('ALL'); setPage(1); }}>×</button>
                    </span>
                  )}
                  {(minPrice || maxPrice) && (
                    <span className="active-filter-tag">
                      Giá: {minPrice ? formatVND(minPrice) : '0₫'} - {maxPrice ? formatVND(maxPrice) : '∞'}
                      <button onClick={() => { setMinPrice(''); setMaxPrice(''); setPage(1); }}>×</button>
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
              <>
                <div className="home-product-grid">
                  {paginatedProducts.map((product) => (
                    <ProductCard key={product.product_id} product={product} />
                  ))}
                </div>

                {/* THANH PHÂN TRANG */}
                {totalPages > 1 && (
                  <div className="products-pagination-wrap">
                    <button
                      type="button"
                      className="pagination-btn pagination-nav-btn"
                      disabled={validPage === 1}
                      onClick={() => handlePageChange(validPage - 1)}
                      title="Trang trước"
                      aria-label="Trang trước"
                    >
                      <ion-icon name="chevron-back-outline"></ion-icon>
                      <span>Trước</span>
                    </button>

                    <div className="pagination-numbers-list">
                      {getPageNumbers().map((p, idx) =>
                        p === '...' ? (
                          <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                            •••
                          </span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            className={`pagination-number-btn ${p === validPage ? 'active' : ''}`}
                            onClick={() => handlePageChange(p)}
                          >
                            {p}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      className="pagination-btn pagination-nav-btn"
                      disabled={validPage === totalPages}
                      onClick={() => handlePageChange(validPage + 1)}
                      title="Trang sau"
                      aria-label="Trang sau"
                    >
                      <span>Sau</span>
                      <ion-icon name="chevron-forward-outline"></ion-icon>
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

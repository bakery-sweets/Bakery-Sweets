import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import { useState, useEffect } from "react";
import "./Header.css";

export default function Header() {
  const { user, logout } = useAuthStore();
  const { totalItems, toggleCart, resetLocal } = useCartStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Lấy từ khóa search hiện tại từ URL query
  const urlSearch = new URLSearchParams(location.search).get("search") || "";
  const [search, setSearch] = useState(urlSearch);

  // Đồng bộ ô tìm kiếm khi URL thay đổi
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    const query = search.trim();
    if (query) {
      navigate(`/?search=${encodeURIComponent(query)}`);
    } else {
      navigate("/");
    }
  };

  const handleClear = () => {
    setSearch("");
    navigate("/");
  };

  const displayName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.phone : "";

  const handleLogout = () => {
    logout();
    resetLocal();
    setMenuOpen(false);
    navigate("/login");
  };

  return (
    <>
      <div className="header">
        <div className="logo-container">
          <Link to="/" className="logo">
            <img src="/assets/Img/Sweets1.png" alt="The Sweets" className="logo-img" />
          </Link>
        </div>

        <nav className="navigation">
          <div className="nav-left">
            <Link to="/">HOME</Link>
            <Link to="/about">ABOUT</Link>
            <Link to="/receipt">RECEIPT</Link>
            <div className="cart-wrapper">
              <button className="sp-cart" onClick={toggleCart}>
                <ion-icon name="cart-outline"></ion-icon>
              </button>
              {totalItems() > 0 && <span className="cart-count">{totalItems()}</span>}
            </div>
          </div>

          <div className="nav-center">
            <form onSubmit={handleSearch} className="search-container">
              <div className="input-wrapper">
                <input
                  type="text"
                  className="search-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm theo tên bánh..."
                />
                {search && (
                  <button
                    type="button"
                    className="header-clear-btn"
                    onClick={handleClear}
                    title="Xóa từ khóa"
                  >
                    <ion-icon name="close-circle"></ion-icon>
                  </button>
                )}
                <button className="searchBtn" type="submit" title="Tìm kiếm" aria-label="Tìm kiếm">
                  <ion-icon name="search-outline"></ion-icon>
                </button>
              </div>
            </form>
          </div>

          <div className="nav-right">
            <div className="auth-container">
              {user ? (
                <>
                  <button className="btnLogin-popup" style={{border: 'none'}}>{displayName}</button>
                  <button className="btnLogout-popup" onClick={handleLogout}>Logout</button>
                </>
              ) : (
                <>
                  <button className="btnLogin-popup" onClick={() => navigate("/login")}>Login</button>
                  <button className="btnLogout-popup" onClick={() => navigate("/register")}>Register</button>
                </>
              )}
            </div>
          </div>
        </nav>
        
        <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <div className="bar"></div><div className="bar"></div><div className="bar"></div>
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          <div className="hamburger" onClick={() => setMenuOpen(false)}>
            <div className="bar"></div><div className="bar"></div><div className="bar"></div>
          </div>
          <div className="mobile-menu-off">
            <Link to="/" onClick={() => setMenuOpen(false)}>HOME</Link>
            <Link to="/about" onClick={() => setMenuOpen(false)}>ABOUT</Link>
            <Link to="/receipt" onClick={() => setMenuOpen(false)}>RECEIPT</Link>
            <button className="sp-cart" onClick={() => { toggleCart(); setMenuOpen(false); }}>
              <ion-icon name="cart-outline"></ion-icon>
            </button>
            <div className="btn-log">
              {user ? (
                <button className="btnLogout-popup" onClick={handleLogout}>Logout</button>
              ) : (
                <>
                  <button className="btnLogin-popup" onClick={() => { navigate("/login"); setMenuOpen(false); }}>Login</button>
                  <button className="btnLogout-popup" onClick={() => { navigate("/register"); setMenuOpen(false); }}>Register</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

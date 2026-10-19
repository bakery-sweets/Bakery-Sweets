import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import { useState } from "react";
import "./Header.css";

export default function Header() {
  const { user, logout } = useAuthStore();
  const { totalItems, toggleCart } = useCartStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/search?term=${encodeURIComponent(search.trim())}`);
  };

  const handleLogout = () => {
    logout();
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

          <div className="nav-center" style={{ visibility: isHome ? "visible" : "hidden", pointerEvents: isHome ? "auto" : "none" }}>
            <form onSubmit={handleSearch} className="search-container">
              <div className="input-wrapper">
                <input
                  type="text"
                  className="search-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for names.."
                  disabled={!isHome}
                />
                <button className="searchBtn" type="submit" disabled={!isHome}>
                  <ion-icon name="search-outline"></ion-icon>
                </button>
              </div>
            </form>
          </div>

          <div className="nav-right">
            <Link to="/search" className="searchAdvance">ADVANCED SEARCH</Link>
            <div className="auth-container">
              {user ? (
                <>
                  <button className="btnLogin-popup" style={{border: 'none'}}>{user.username}</button>
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

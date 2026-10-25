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

  const displayName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.phone
    : "";

  const handleLogout = () => {
    logout();
    resetLocal();
    setMenuOpen(false);
    navigate("/login");
  };

  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHeroPage = location.pathname === "/" || location.pathname === "/about";

  // Tăng nhẹ độ bóng khi cuộn trang hoặc đổi sang nền trắng kính mờ trên trang hero
  useEffect(() => {
    const handleScroll = () => {
      const threshold = isHeroPage ? 50 : 10;
      setScrolled(window.scrollY > threshold);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHeroPage]);

  return (
    <>
      <header className={`header-wrapper ${isHeroPage ? "is-hero" : ""} ${scrolled ? "scrolled" : ""}`}>
        <div className="header-inner">
          {/* CỘT TRÁI: LOGO */}
          <div className="logo-container">
            <Link to="/" className="logo" aria-label="Trang chủ The Sweets">
              <img src="/assets/Img/Sweets1.png" alt="The Sweets" className="logo-img" />
            </Link>
          </div>

          {/* CỘT GIỮA: CÁC LINK MENU CHÍNH */}
          <div className="nav-center">
            <Link to="/" className={`nav-link ${location.pathname === "/" ? "active" : ""}`}>
              Trang chủ
            </Link>
            <Link to="/products" className={`nav-link ${location.pathname === "/products" ? "active" : ""}`}>
              Thực đơn
            </Link>
            <Link to="/about" className={`nav-link ${location.pathname === "/about" ? "active" : ""}`}>
              Giới thiệu
            </Link>
            <Link to="/receipt" className={`nav-link ${location.pathname === "/receipt" ? "active" : ""}`}>
              Hóa đơn
            </Link>
          </div>

          {/* CỘT PHẢI: GIỎ HÀNG & TÀI KHOẢN */}
          <div className="nav-right">
            <div className="cart-wrapper">
              <button className="sp-cart" onClick={toggleCart} title="Giỏ hàng" aria-label="Giỏ hàng">
                <ion-icon name="cart-outline"></ion-icon>
              </button>
              {totalItems() > 0 && <span className="cart-count">{totalItems()}</span>}
            </div>

            <div className="auth-container">
              {user ? (
                <>
                  <button className="btnLogin-popup user-name-btn" title="Tài khoản của bạn">
                    {displayName}
                  </button>

                  

                  <button className="btnLogout-popup" onClick={handleLogout}>
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <button className="btnLogin-popup" onClick={() => navigate("/login")}>
                    Đăng nhập
                  </button>
                  <button className="btnLogout-popup" onClick={() => navigate("/register")}>
                    Đăng ký
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              className="hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Mở menu điều hướng"
            >
              <div className="bar"></div>
              <div className="bar"></div>
              <div className="bar"></div>
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <div className="hamburger" onClick={() => setMenuOpen(false)}>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </div>
          <div className="mobile-menu-off">
            <Link to="/" onClick={() => setMenuOpen(false)}>
              TRANG CHỦ
            </Link>
            <Link to="/products" onClick={() => setMenuOpen(false)}>
              THỰC ĐƠN
            </Link>
            <Link to="/about" onClick={() => setMenuOpen(false)}>
              GIỚI THIỆU
            </Link>
            <Link to="/receipt" onClick={() => setMenuOpen(false)}>
              HÓA ĐƠN
            </Link>
            <button
              className="sp-cart mobile-sp-cart"
              onClick={() => {
                toggleCart();
                setMenuOpen(false);
              }}
            >
              <ion-icon name="cart-outline"></ion-icon>
              <span>Giỏ hàng ({totalItems()})</span>
            </button>
            <div className="btn-log">
              {user ? (
                <>
                  <div className="mobile-user-info">
                    <ion-icon name="person-circle-outline"></ion-icon>
                    <span>{displayName}</span>
                  </div>
                  <button className="btnLogout-popup" onClick={handleLogout}>
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btnLogin-popup"
                    onClick={() => {
                      navigate("/login");
                      setMenuOpen(false);
                    }}
                  >
                    Đăng nhập
                  </button>
                  <button
                    className="btnLogout-popup"
                    onClick={() => {
                      navigate("/register");
                      setMenuOpen(false);
                    }}
                  >
                    Đăng ký
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

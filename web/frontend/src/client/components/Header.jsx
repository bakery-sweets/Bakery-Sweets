import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import { useState, useEffect, useRef } from "react";
import { clientPromotionsApi } from "../../api/client";
import "./Header.css";

const FALLBACK_VOUCHERS = [
  {
    promotion_id: "v1",
    promotion_code: "SWEET10",
    promotion_name: "Chào bạn mới ngọt ngào",
    description: "Giảm 10% tối đa 20.000₫ cho đơn từ 80.000₫",
    badge: "Mới",
    time_text: "Hôm nay",
  },
  {
    promotion_id: "v2",
    promotion_code: "BANHNGOT",
    promotion_name: "Tuần lễ bánh tươi ngon",
    description: "Giảm 15% tối đa 35.000₫ cho đơn từ 150.000₫",
    badge: "Hot Deal",
    time_text: "Vừa cập nhật",
  },
  {
    promotion_id: "v5",
    promotion_code: "FREESHIP",
    promotion_name: "Freeship tận cửa tiệm bánh",
    description: "Miễn phí vận chuyển tới 25.000₫ đơn từ 120.000₫",
    badge: "Freeship",
    time_text: "Đang diễn ra",
  },
  {
    promotion_id: "v3",
    promotion_code: "CTKM01",
    promotion_name: "Ưu đãi khách hàng thân thiết",
    description: "Giảm tới 15% tối đa 80.000₫ cho đơn từ 200.000₫",
    badge: "Thành viên",
    time_text: "Có hạn",
  },
];

export default function Header() {
  const { user, logout } = useAuthStore();
  const { totalItems, toggleCart, resetLocal } = useCartStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [vouchers, setVouchers] = useState(FALLBACK_VOUCHERS);
  const [copiedCode, setCopiedCode] = useState(null);
  const [hasUnread, setHasUnread] = useState(true);

  const bellRef = useRef(null);
  const navigate = useNavigate();

  const displayName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.phone
    : "";

  // Lấy danh sách voucher từ API để cập nhật thông báo
  useEffect(() => {
    clientPromotionsApi
      .getAll()
      .then((res) => {
        const apiData = res.data || [];
        if (apiData.length > 0) {
          const apiCodes = new Set(apiData.map((p) => p.promotion_code));
          const filteredDefaults = FALLBACK_VOUCHERS.filter(
            (d) => !apiCodes.has(d.promotion_code)
          );
          setVouchers([...apiData, ...filteredDefaults]);
        }
      })
      .catch(() => {
        // Sử dụng danh sách fallback mặc định nếu API lỗi
      });
  }, []);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notifOpen]);

  const handleLogout = () => {
    logout();
    resetLocal();
    setMenuOpen(false);
    setNotifOpen(false);
    navigate("/login");
  };

  const handleToggleNotif = () => {
    setNotifOpen((prev) => !prev);
    if (!notifOpen) {
      setHasUnread(false);
    }
  };

  const handleCopyCode = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const handleNavigateVouchers = () => {
    setNotifOpen(false);
    setMenuOpen(false);
    navigate("/vouchers");
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
            {/* <Link to="/vouchers" className="nav-voucher-link">
              VOUCHERS
              <span className="nav-voucher-tag">HOT</span>
            </Link> */}
            <div className="cart-wrapper">
              <button className="sp-cart" onClick={toggleCart} title="Giỏ hàng">
                <ion-icon name="cart-outline"></ion-icon>
              </button>
              {totalItems() > 0 && <span className="cart-count">{totalItems()}</span>}
            </div>
          </div>

          <div className="nav-right">
            <div className="auth-container">
              {user ? (
                <>
{/* Icon chuông thông báo voucher kế bên tên */}
                  <div className="voucher-bell-wrapper" ref={bellRef}>
                    <button
                      type="button"
                      className={`voucher-bell-btn ${notifOpen ? "active" : ""}`}
                      onClick={handleToggleNotif}
                      title="Thông báo Voucher & Khuyến mãi"
                      aria-label="Thông báo Voucher"
                    >
                      <ion-icon name="notifications-outline"></ion-icon>
                      {hasUnread && vouchers.length > 0 && (
                        <span className="voucher-bell-badge">{vouchers.length}</span>
                      )}
                    </button>

                    {/* Dropdown thông báo voucher */}
                    {notifOpen && (
                      <div className="voucher-notif-dropdown">
                        <div className="voucher-notif-header">
                          <div className="voucher-notif-title-box">
                            <ion-icon name="gift-outline"></ion-icon>
                            <span>Thông Báo Ưu Đãi</span>
                          </div>
                          <span className="voucher-notif-count">
                            {vouchers.length} voucher
                          </span>
                        </div>

                        <div className="voucher-notif-list">
                          {vouchers.slice(0, 4).map((voucher) => {
                            const code = voucher.promotion_code;
                            const isCopied = copiedCode === code;
                            return (
                              <div
                                key={voucher.promotion_id || code}
                                className="voucher-notif-item"
                                onClick={handleNavigateVouchers}
                              >
                                <div className="voucher-notif-icon">
                                  <ion-icon name="ticket-outline"></ion-icon>
                                </div>
                                <div className="voucher-notif-info">
                                  <div className="voucher-notif-top">
                                    <span className="voucher-notif-name">
                                      {voucher.promotion_name}
                                    </span>
                                    {voucher.badge && (
                                      <span className="voucher-notif-badge">
                                        {voucher.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="voucher-notif-desc">
                                    {voucher.description}
                                  </p>
                                  <div className="voucher-notif-actions">
                                    <span className="voucher-notif-code">{code}</span>
                                    <button
                                      type="button"
                                      className={`voucher-notif-copy-btn ${
                                        isCopied ? "copied" : ""
                                      }`}
                                      onClick={(e) => handleCopyCode(e, code)}
                                      title="Sao chép mã"
                                    >
                                      {isCopied ? (
                                        <>
                                          <ion-icon name="checkmark-outline"></ion-icon>
                                          Đã chép
                                        </>
                                      ) : (
                                        <>
                                          <ion-icon name="copy-outline"></ion-icon>
                                          Sao chép
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="voucher-notif-footer">
                          <button
                            type="button"
                            className="voucher-notif-all-btn"
                            onClick={handleNavigateVouchers}
                          >
                            Xem tất cả voucher ({vouchers.length}) &rarr;
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button className="btnLogin-popup user-name-btn" title="Tài khoản của bạn">
                    {displayName}
                  </button>

                  

                  <button className="btnLogout-popup" onClick={handleLogout}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  {/* Nếu khách chưa đăng nhập, vẫn có thể nhận thông báo voucher */}
                  <div className="voucher-bell-wrapper" ref={bellRef}>
                    <button
                      type="button"
                      className={`voucher-bell-btn ${notifOpen ? "active" : ""}`}
                      onClick={handleToggleNotif}
                      title="Thông báo Voucher & Khuyến mãi"
                      aria-label="Thông báo Voucher"
                    >
                      <ion-icon name="notifications-outline"></ion-icon>
                      {hasUnread && vouchers.length > 0 && (
                        <span className="voucher-bell-badge">{vouchers.length}</span>
                      )}
                    </button>

                    {notifOpen && (
                      <div className="voucher-notif-dropdown">
                        <div className="voucher-notif-header">
                          <div className="voucher-notif-title-box">
                            <ion-icon name="gift-outline"></ion-icon>
                            <span>Thông Báo Ưu Đãi</span>
                          </div>
                          <span className="voucher-notif-count">
                            {vouchers.length} voucher
                          </span>
                        </div>

                        <div className="voucher-notif-list">
                          {vouchers.slice(0, 4).map((voucher) => {
                            const code = voucher.promotion_code;
                            const isCopied = copiedCode === code;
                            return (
                              <div
                                key={voucher.promotion_id || code}
                                className="voucher-notif-item"
                                onClick={handleNavigateVouchers}
                              >
                                <div className="voucher-notif-icon">
                                  <ion-icon name="ticket-outline"></ion-icon>
                                </div>
                                <div className="voucher-notif-info">
                                  <div className="voucher-notif-top">
                                    <span className="voucher-notif-name">
                                      {voucher.promotion_name}
                                    </span>
                                    {voucher.badge && (
                                      <span className="voucher-notif-badge">
                                        {voucher.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="voucher-notif-desc">
                                    {voucher.description}
                                  </p>
                                  <div className="voucher-notif-actions">
                                    <span className="voucher-notif-code">{code}</span>
                                    <button
                                      type="button"
                                      className={`voucher-notif-copy-btn ${
                                        isCopied ? "copied" : ""
                                      }`}
                                      onClick={(e) => handleCopyCode(e, code)}
                                    >
                                      {isCopied ? "Đã chép ✓" : "Sao chép"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="voucher-notif-footer">
                          <button
                            type="button"
                            className="voucher-notif-all-btn"
                            onClick={handleNavigateVouchers}
                          >
                            Xem tất cả voucher ({vouchers.length}) &rarr;
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button className="btnLogin-popup" onClick={() => navigate("/login")}>
                    Login
                  </button>
                  <button className="btnLogout-popup" onClick={() => navigate("/register")}>
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>

        <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          <div className="hamburger" onClick={() => setMenuOpen(false)}>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </div>
          <div className="mobile-menu-off">
            <Link to="/" onClick={() => setMenuOpen(false)}>
              HOME
            </Link>
            <Link to="/about" onClick={() => setMenuOpen(false)}>
              ABOUT
            </Link>
            <Link to="/receipt" onClick={() => setMenuOpen(false)}>
              RECEIPT
            </Link>
            <Link to="/vouchers" onClick={() => setMenuOpen(false)}>
              VOUCHERS
              <span className="mobile-voucher-tag">HOT</span>
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
                    Logout
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
                    Login
                  </button>
                  <button
                    className="btnLogout-popup"
                    onClick={() => {
                      navigate("/register");
                      setMenuOpen(false);
                    }}
                  >
                    Register
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

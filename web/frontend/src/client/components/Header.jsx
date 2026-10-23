import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import { useState, useEffect, useRef } from "react";
import { clientPromotionsApi, clientNotificationsApi } from "../../api/client";
import { voucherDescription } from "../../utils/voucher";
import "./Header.css";

const MAX_NOTIFS = 5;
// Chu kỳ hỏi server thông báo mới (voucher admin vừa tạo / sửa, cập nhật đơn hàng)
const POLL_MS = 30000;

const NOTIF_ICON = {
  promotion: "ticket-outline",
  order: "receipt-outline",
  system: "information-circle-outline",
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
};

export default function Header() {
  const { user, logout } = useAuthStore();
  const { totalItems, toggleCart, resetLocal } = useCartStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  // Đã đăng nhập: 5 thông báo gần nhất của tài khoản; chưa đăng nhập: 5 voucher mới nhất
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [vouchers, setVouchers] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);
  const [guestSeen, setGuestSeen] = useState(false);

  const bellRef = useRef(null);
  const navigate = useNavigate();

  const displayName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.phone
    : "";

  useEffect(() => {
    if (!user) {
      setNotifs([]);
      setUnreadCount(0);
      clientPromotionsApi
        .getAll()
        .then((res) => setVouchers((res.data || []).slice(0, MAX_NOTIFS)))
        .catch(() => setVouchers([]));
      return undefined;
    }

    const loadNotifs = () =>
      clientNotificationsApi
        .getRecent(MAX_NOTIFS)
        .then((res) => {
          setNotifs(res.data.items);
          setUnreadCount(res.data.unread_count);
        })
        .catch(() => {});

    loadNotifs();
    const timer = setInterval(loadNotifs, POLL_MS);
    return () => clearInterval(timer);
  }, [user?.phone]);

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
    const opening = !notifOpen;
    setNotifOpen(opening);
    // Mở chuông là xem hết: đánh dấu đã đọc trên server, danh sách vẫn giữ chấm "mới" tới lần tải sau
    if (opening && user && unreadCount > 0) {
      setUnreadCount(0);
      clientNotificationsApi.markAllRead().catch(() => {});
    }
    if (opening && !user) setGuestSeen(true);
  };

  const handleCopyCode = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Tăng nhẹ độ bóng khi cuộn trang
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const copyButton = (code) => {
    const isCopied = copiedCode === code;
    return (
      <button
        type="button"
        className={`voucher-notif-copy-btn ${isCopied ? "copied" : ""}`}
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
    );
  };

  const badgeCount = user ? unreadCount : guestSeen ? 0 : vouchers.length;

  // Chuông thông báo dùng chung cho cả khách đã và chưa đăng nhập
  const bell = (
    <div className="voucher-bell-wrapper" ref={bellRef}>
      <button
        type="button"
        className={`voucher-bell-btn ${notifOpen ? "active" : ""}`}
        onClick={handleToggleNotif}
        title={user ? "Thông báo của bạn" : "Ưu đãi đang có"}
        aria-label="Thông báo"
      >
        <ion-icon name="notifications-outline"></ion-icon>
        {badgeCount > 0 && (
          <span className="voucher-bell-badge">{badgeCount > 9 ? "9+" : badgeCount}</span>
        )}
      </button>

      {notifOpen && (
        <div className="voucher-notif-dropdown">
          <div className="voucher-notif-header">
            <div className="voucher-notif-title-box">
              <ion-icon name={user ? "notifications-outline" : "gift-outline"}></ion-icon>
              <span>{user ? "Thông Báo" : "Ưu Đãi Đang Có"}</span>
            </div>
            <span className="voucher-notif-count">
              {user ? `${notifs.length} gần nhất` : `${vouchers.length} voucher`}
            </span>
          </div>

          <div className="voucher-notif-list">
            {user ? (
              <>
                {notifs.length === 0 && (
                  <p className="voucher-notif-desc" style={{ padding: "12px 16px", margin: 0 }}>
                    Bạn chưa có thông báo nào.
                  </p>
                )}
                {notifs.map((n) => (
                  <div
                    key={n.notification_id}
                    className="voucher-notif-item"
                    style={n.is_read ? undefined : { background: "#fff7f9" }}
                  >
                    <div className="voucher-notif-icon">
                      <ion-icon name={NOTIF_ICON[n.type] || "notifications-outline"}></ion-icon>
                    </div>
                    <div className="voucher-notif-info">
                      <div className="voucher-notif-top">
                        <span className="voucher-notif-name">{n.title}</span>
                        {!n.is_read && <span className="voucher-notif-badge">Mới</span>}
                      </div>
                      <p className="voucher-notif-desc">{n.message}</p>
                      <div className="voucher-notif-actions">
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>{timeAgo(n.created_at)}</span>
                        {n.promotion_code && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <span className="voucher-notif-code">{n.promotion_code}</span>
                            {copyButton(n.promotion_code)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {vouchers.length === 0 && (
                  <p className="voucher-notif-desc" style={{ padding: "12px 16px", margin: 0 }}>
                    Hiện chưa có voucher nào.
                  </p>
                )}
                {vouchers.map((voucher) => (
                  <div key={voucher.promotion_id} className="voucher-notif-item">
                    <div className="voucher-notif-icon">
                      <ion-icon name="ticket-outline"></ion-icon>
                    </div>
                    <div className="voucher-notif-info">
                      <div className="voucher-notif-top">
                        <span className="voucher-notif-name">{voucher.promotion_name}</span>
                      </div>
                      <p className="voucher-notif-desc">{voucherDescription(voucher)}</p>
                      <div className="voucher-notif-actions">
                        <span className="voucher-notif-code">{voucher.promotion_code}</span>
                        {copyButton(voucher.promotion_code)}
                      </div>
                    </div>
                  </div>
                ))}
                <p className="voucher-notif-desc" style={{ padding: "10px 16px", margin: 0, textAlign: "center" }}>
                  Đăng nhập để nhận thông báo ưu đãi &amp; đơn hàng của bạn.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <header className={`header-wrapper ${scrolled ? "scrolled" : ""}`}>
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
              HOME
            </Link>
            <Link to="/about" className={`nav-link ${location.pathname === "/about" ? "active" : ""}`}>
              ABOUT
            </Link>
            <Link to="/receipt" className={`nav-link ${location.pathname === "/receipt" ? "active" : ""}`}>
              RECEIPT
            </Link>
          </div>

          {/* CỘT PHẢI: GIỎ HÀNG, THÔNG BÁO VOUCHER & TÀI KHOẢN */}
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
                  {bell}

                  <button className="btnLogin-popup user-name-btn" title="Tài khoản của bạn">
                    {displayName}
                  </button>

                  

                  <button className="btnLogout-popup" onClick={handleLogout}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  {bell}

                  <button className="btnLogin-popup" onClick={() => navigate("/login")}>
                    Login
                  </button>
                  <button className="btnLogout-popup" onClick={() => navigate("/register")}>
                    Register
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
              HOME
            </Link>
            <Link to="/about" onClick={() => setMenuOpen(false)}>
              ABOUT
            </Link>
            <Link to="/receipt" onClick={() => setMenuOpen(false)}>
              RECEIPT
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

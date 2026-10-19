import React from "react";
import "./Footer.css";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <footer className="site-footer">
      <div className="footer-main-container">
        
        {/* LƯỚI FOOTER: 4 CỘT TRÊN DESKTOP, 2 CỘT TRÊN ĐIỆN THOẠI */}
        <div className="footer-grid">
          
          {/* CỘT 1: INTRODUCE */}
          <div className="footer-col">
            <h3 className="footer-title">INTRODUCE</h3>
            <ul className="footer-links">
              <li><a href="/about">Về Chúng Tôi</a></li>
              <li><a href="#terms">Thoả Thuận Sử Dụng</a></li>
              <li><a href="#rules">Quy Chế Hoạt Động</a></li>
              <li><a href="#privacy">Chính Sách Bảo Mật</a></li>
            </ul>
          </div>

          {/* CỘT 2: CORNER FOOD */}
          <div className="footer-col">
            <h3 className="footer-title">CORNER FOOD</h3>
            <ul className="footer-links">
              <li><a href="/search?category=MOUSSE">Mouse</a></li>
              <li><a href="/search?category=CROISSANT">Croissant</a></li>
              <li><a href="/search?category=DRINK">Drink</a></li>
            </ul>
          </div>

          {/* CỘT 3: SUPPORT */}
          <div className="footer-col">
            <h3 className="footer-title">SUPPORT</h3>
            <ul className="footer-links">
              <li><a href="#feedback">Góp Ý</a></li>
              <li><a href="#careers">Tuyển Dụng</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>

          {/* CỘT 4: LOGO TO HƠN VÀ ICON CONNECT NẰM BÊN DƯỚI */}
          <div className="footer-col footer-brand-col">
            <div className="footer-logo-wrap">
              <img src="/assets/Img/Sweets1.png" alt="The Sweets" className="footer-logo-img" />
            </div>
            <div className="footer-social-icons">
              <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube" className="social-icon-btn">
                <ion-icon name="logo-youtube"></ion-icon>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="social-icon-btn">
                <ion-icon name="logo-facebook"></ion-icon>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="social-icon-btn">
                <ion-icon name="logo-instagram"></ion-icon>
              </a>
            </div>
          </div>

        </div>

        {/* BẢN QUYỀN COPYRIGHT CĂN GIỮA CHUẨN XÁC THEO HÌNH DESKTOP */}
        <div className="footer-bottom-info">
          <p className="footer-copyright">
            &copy; copyright 2024 by The MBM Group | Công ty TNHH The Sweets | Design by The MESince
          </p>
        </div>

      </div>

      {/* NÚT CUỘN LÊN ĐẦU TRANG SÁT BIÊN PHẢI MÀN HÌNH */}
      <button 
        type="button" 
        onClick={scrollToTop} 
        className="footer-scroll-top-btn" 
        aria-label="Cuộn lên đầu trang"
        title="Lên đầu trang"
      >
        <ion-icon name="arrow-up-outline"></ion-icon>
      </button>
    </footer>
  );
}

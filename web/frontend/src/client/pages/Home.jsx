import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { clientProductsApi } from '../../api/client';
import ProductCard from '../components/ProductCard';
import { imageUrl, apiErrorMessage } from '../../utils/format';
import './Home.css';

const BANNERS = ['/assets/Img/banner1.jpg', '/assets/Img/banner2.jpg'];

const NEW_PRODUCTS_COUNT = 5;

const ORDER_STEPS = [
  {
    icon: 'storefront',
    title: 'Chọn bánh yêu thích',
    desc: 'Xem thực đơn, chọn món và size rồi thêm vào giỏ hàng.',
  },
  {
    icon: 'time',
    title: 'Hẹn giờ nhận bánh',
    desc: 'Chọn ngày giờ đến lấy, thanh toán tiền mặt hoặc chuyển khoản.',
  },
  {
    icon: 'bag-check',
    title: 'Nhận bánh tại tiệm',
    desc: 'Bánh được chuẩn bị sẵn, bạn chỉ cần ghé tiệm đúng giờ đã hẹn.',
  },
];

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export default function Home() {
  const [products, setProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    Promise.all([
      clientProductsApi.getAll(),
      clientProductsApi.getBestSellers ? clientProductsApi.getBestSellers(4) : Promise.resolve({ data: [] }),
    ])
      .then(([productRes, bestRes]) => {
        const availableProducts = (productRes.data || []).filter((p) => p.sizes.length > 0);
        setProducts(availableProducts);
        if (bestRes?.data?.length > 0) {
          setBestSellers(bestRes.data.filter((p) => p.sizes.length > 0).slice(0, 4));
        } else {
          setBestSellers(availableProducts.slice(0, 4));
        }
      })
      .catch((err) => setLoadError(apiErrorMessage(err, 'Không tải được danh sách bánh.')))
      .finally(() => setLoading(false));
  }, []);

  // Banner slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % BANNERS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Chỉ lấy tối đa 4 món mới nhất ra mắt trong vòng 1 tháng
  const newProducts = useMemo(() => {
    const now = Date.now();
    return products
      .filter((p) => {
        if (!p.created_at) return true;
        const t = new Date(p.created_at).getTime();
        return !isNaN(t) && now - t <= ONE_MONTH_MS;
      })
      .sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA || b.product_id - a.product_id;
      })
      .slice(0, 4);
  }, [products]);

  return (
    <div className="home-page-wrapper">
      {/* BANNER SLIDER FULL KHUNG HÌNH */}
      <div className="home-banner-container">
        {BANNERS.map((banner, idx) => (
          <img
            key={idx}
            src={banner}
            alt={`Banner ${idx + 1}`}
            className={`home-banner-img ${currentBanner === idx ? 'active' : ''}`}
          />
        ))}

        {/* LỚP PHỦ NỘI DUNG HERO BANNER */}
        <div className="home-hero-overlay">
          <div className="home-hero-content">
            <h1 className="home-hero-title">
              <span className="hero-title-main">Hương Vị Ngọt Ngào</span>
              <span className="hero-title-sub">Từ Trái Tim</span>
            </h1>
            <p className="home-hero-desc">
              Từng chiếc bánh cao cấp được tuyển chọn và nhập mới mỗi ngày, gửi gắm trọn vẹn hương vị tinh tế cùng chút ngọt ngào đến bạn.
            </p>
            <div className="home-hero-actions">
              <Link to="/products" className="hero-btn-primary">
                <span>Đặt Bánh Ngay</span>
                <ion-icon name="arrow-forward-outline"></ion-icon>
              </Link>
              <button
                type="button"
                className="hero-btn-secondary"
                onClick={() => {
                  const el = document.querySelector('.home-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>Xem Thực Đơn</span>
                <ion-icon name="restaurant-outline"></ion-icon>
              </button>
            </div>
          </div>
        </div>

        {/* Các chấm điều hướng banner */}
        <div className="home-banner-dots">
          {BANNERS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`home-banner-dot ${currentBanner === idx ? 'active' : ''}`}
              onClick={() => setCurrentBanner(idx)}
              aria-label={`Chuyển tới banner ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* BĂNG THỐNG KÊ CAM KẾT (DƯỚI HERO BANNER) */}
      <div className="home-stats-strip">
        <div className="home-stats-container">
          <div className="home-stat-item">
            <div className="stat-number">100%</div>
            <div className="stat-label">Bánh Tươi Nhập Khẩu</div>
          </div>
          <div className="stat-divider"></div>
          <div className="home-stat-item">
            <div className="stat-number stat-highlight">08:00</div>
            <div className="stat-label">Bánh Mới Về Tiệm Mỗi Ngày</div>
          </div>
          <div className="stat-divider"></div>
          <div className="home-stat-item">
            <div className="stat-number">15 Phút</div>
            <div className="stat-label">Chuẩn Bị Sẵn Nhận Tại Tiệm</div>
          </div>
        </div>
      </div>

      {/* NHỮNG CHIẾC BÁNH ĐƯỢC YÊU THÍCH NHẤT */}
      {!loading && !loadError && bestSellers.length > 0 && (
        <section className="home-section">
          <div className="home-section-head">
            <div>
              <p className="home-section-eyebrow">Tuyển chọn bán chạy</p>
              <h2 className="home-favorite-title">Bánh được yêu thích nhất</h2>
            </div>
            <Link to="/products" className="home-section-link">
              Xem tất cả <ion-icon name="arrow-forward-outline"></ion-icon>
            </Link>
          </div>
          <div className="home-bestsellers-grid">
            {bestSellers.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* MÓN MỚI RA LÒ (TỐI ĐA 4 MÓN TRONG 1 THÁNG) */}
      {!loading && !loadError && newProducts.length > 0 && (
        <section className="home-section">
          <div className="home-section-head">
            <div>
              <p className="home-section-eyebrow">Vừa ra lò</p>
              <h2 className="home-favorite-title">Món mới</h2>
            </div>
            <Link to="/products" className="home-section-link">
              Xem thực đơn <ion-icon name="arrow-forward-outline"></ion-icon>
            </Link>
          </div>
          <div className="home-bestsellers-grid">
            {newProducts.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* CÁCH ĐẶT BÁNH 3 BƯỚC */}
      <section className="home-section">
        <div className="home-section-head home-section-head-center">
          <div>
            <p className="home-section-eyebrow">Đặt trước, đến là có</p>
            <h2 className="home-section-title">Đặt bánh chỉ với 3 bước</h2>
          </div>
        </div>
        <div className="home-steps-process">
          <div className="process-connecting-line"></div>
          <div className="home-steps-grid">
            {ORDER_STEPS.map((step, idx) => (
              <div key={step.title} className="home-step-col">
                <div className="home-step-circle-badge">
                  <span>{idx + 1}</span>
                </div>
                <div className="home-step-card">
                  <div className="home-step-icon">
                    <ion-icon name={step.icon}></ion-icon>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

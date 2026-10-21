import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clientPromotionsApi } from '../../api/client';
import { formatVND } from '../../utils/format';
import './Vouchers.css';

const DEFAULT_VOUCHERS = [
  {
    promotion_id: 'v1',
    promotion_code: 'SWEET10',
    promotion_name: 'Voucher Chào Bạn Mới',
    description: 'Giảm 10% tối đa 20.000₫ cho đơn hàng từ 80.000₫ dành cho thành viên mới',
    discount_percentage: 10,
    min_order_value: 80000,
    max_discount_value: 20000,
    end_date: '2026-12-31T23:59:59',
    badge: 'Khách Mới',
    tag: 'welcome',
  },
  {
    promotion_id: 'v2',
    promotion_code: 'BANHNGOT',
    promotion_name: 'Tuần Lễ Bánh Ngọt Tươi',
    description: 'Giảm 15% tối đa 35.000₫ cho đơn hàng từ 150.000₫ áp dụng toàn menu',
    discount_percentage: 15,
    min_order_value: 150000,
    max_discount_value: 35000,
    end_date: '2026-12-31T23:59:59',
    badge: 'Hot Deal',
    tag: 'special',
  },
  {
    promotion_id: 'v3',
    promotion_code: 'CTKM01',
    promotion_name: 'Ưu Đãi Khách Hàng Thân Thiết',
    description: 'Giảm 10% từ 200.000₫, giảm 15% tối đa 80.000₫ từ 500.000₫',
    discount_percentage: 15,
    min_order_value: 200000,
    max_discount_value: 80000,
    end_date: '2026-12-31T23:59:59',
    badge: 'Hội Viên',
    tag: 'loyalty',
  },
  {
    promotion_id: 'v4',
    promotion_code: 'CTKM02',
    promotion_name: 'Tri Ân Mùa Lễ Hội',
    description: 'Giảm 12% tối đa 50.000₫ cho đơn hàng từ 300.000₫ thỏa thích tiệc trà',
    discount_percentage: 12,
    min_order_value: 300000,
    max_discount_value: 50000,
    end_date: '2026-12-31T23:59:59',
    badge: 'Lễ Hội',
    tag: 'special',
  },
  {
    promotion_id: 'v5',
    promotion_code: 'FREESHIP',
    promotion_name: 'Miễn Phí Giao Hàng Tận Nơi',
    description: 'Hỗ trợ tối đa 25.000₫ tiền vận chuyển cho đơn hàng từ 120.000₫',
    discount_percentage: 100,
    min_order_value: 120000,
    max_discount_value: 25000,
    end_date: '2026-12-31T23:59:59',
    badge: 'Freeship',
    tag: 'shipping',
  },
  {
    promotion_id: 'v6',
    promotion_code: 'TIEMBANH20',
    promotion_name: 'Giờ Vàng Bánh Nướng Thơm',
    description: 'Giảm 20.000₫ trực tiếp cho mọi đơn hàng từ 100.000₫ đặt trong ngày',
    discount_percentage: 20,
    min_order_value: 100000,
    max_discount_value: 20000,
    end_date: '2026-12-31T23:59:59',
    badge: 'Giờ Vàng',
    tag: 'special',
  },
];

export default function Vouchers() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    clientPromotionsApi.getAll()
      .then((res) => {
        const apiData = res.data || [];
        if (apiData.length > 0) {
          // Gộp các mã từ backend và các mã mặc định
          const apiCodes = new Set(apiData.map(p => p.promotion_code));
          const filteredDefaults = DEFAULT_VOUCHERS.filter(d => !apiCodes.has(d.promotion_code));
          setPromotions([...apiData, ...filteredDefaults]);
        } else {
          setPromotions(DEFAULT_VOUCHERS);
        }
      })
      .catch(() => {
        setPromotions(DEFAULT_VOUCHERS);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const filteredVouchers = useMemo(() => {
    return promotions.filter((item) => {
      const code = (item.promotion_code || item.code || '').toLowerCase();
      const name = (item.promotion_name || item.name || '').toLowerCase();
      const desc = (item.description || item.desc || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchSearch = !q || code.includes(q) || name.includes(q) || desc.includes(q);

      if (!matchSearch) return false;
      if (activeTab === 'all') return true;
      if (activeTab === 'welcome') return item.tag === 'welcome' || code.includes('SWEET') || name.includes('Chào');
      if (activeTab === 'loyalty') return item.tag === 'loyalty' || code.includes('CTKM01') || name.includes('Thân Thiết');
      if (activeTab === 'special') return item.tag === 'special' || code.includes('BANH') || code.includes('CTKM02') || code.includes('TIEMBANH');
      if (activeTab === 'shipping') return item.tag === 'shipping' || code.includes('SHIP') || name.includes('Giao Hàng');
      return true;
    });
  }, [promotions, activeTab, searchQuery]);

  return (
    <div className="vouchers-page-wrapper">
      {/* HERO BANNER VOUCHERS */}
      <section className="vouchers-hero-banner">
        <div className="vouchers-hero-content">
          <span className="vouchers-hero-badge">
            <ion-icon name="sparkles-outline"></ion-icon>
            Ưu Đãi Đặc Quyền
          </span>
          <h1 className="vouchers-hero-title">Kho Voucher & Mã Giảm Giá</h1>
          <p className="vouchers-hero-subtitle">
            Khám phá hàng loạt mã giảm giá hấp dẫn để thưởng thức những mẻ bánh ngọt tươi ngon với giá tốt nhất hôm nay.
          </p>

          {/* Ô TÌM KIẾM MÃ */}
          <div className="vouchers-search-bar">
            <ion-icon name="search-outline"></ion-icon>
            <input
              type="text"
              placeholder="Nhập tên chương trình hoặc mã voucher (VD: SWEET10, BANHNGOT...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                <ion-icon name="close-circle"></ion-icon>
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="vouchers-container">
        {/* TABS LỌC DANH MỤC VOUCHER */}
        <div className="vouchers-tabs-row">
          <button
            type="button"
            className={`voucher-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Tất Cả ({promotions.length})
          </button>
          <button
            type="button"
            className={`voucher-tab-btn ${activeTab === 'welcome' ? 'active' : ''}`}
            onClick={() => setActiveTab('welcome')}
          >
            Khách Hàng Mới
          </button>
          <button
            type="button"
            className={`voucher-tab-btn ${activeTab === 'special' ? 'active' : ''}`}
            onClick={() => setActiveTab('special')}
          >
            Bánh Ngọt & Ưu Đãi
          </button>
        </div>

        {/* DANH SÁCH VOUCHER DẠNG THẺ VÉ */}
        {loading ? (
          <div className="vouchers-loading-box">
            <ion-icon name="sync-outline" className="spin-icon"></ion-icon>
            <p>Đang tải danh sách voucher ưu đãi...</p>
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="vouchers-empty-box">
            <ion-icon name="ticket-outline"></ion-icon>
            <h3>Không tìm thấy mã giảm giá nào phù hợp</h3>
            <p>Vui lòng thử lại với từ khóa khác hoặc chuyển sang danh mục khác.</p>
            <button
              type="button"
              className="vouchers-reset-btn"
              onClick={() => { setActiveTab('all'); setSearchQuery(''); }}
            >
              Xem tất cả voucher
            </button>
          </div>
        ) : (
          <div className="vouchers-grid">
            {filteredVouchers.map((item) => {
              const code = item.promotion_code || item.code;
              const name = item.promotion_name || item.name;
              const desc = item.description || item.desc;
              const minVal = item.min_order_value || item.minOrder || 0;
              const discountPct = item.discount_percentage;
              const maxDiscount = item.max_discount_value;
              const isCopied = copiedCode === code;

              return (
                <div key={item.promotion_id || code} className="voucher-ticket-card">
                  {/* CỘT TRÁI: HUY HIỆU GIẢM GIÁ */}
                  <div className="voucher-ticket-left">
                    <span className="ticket-cutout ticket-cutout-top"></span>
                    <span className="ticket-cutout ticket-cutout-bottom"></span>
                    <div className="ticket-icon-wrap">
                      <ion-icon name={code.includes('SHIP') ? 'car-outline' : 'gift-outline'}></ion-icon>
                    </div>
                    <div className="ticket-discount-text">
                      {discountPct === 100 ? (
                        <>
                          <span className="discount-unit">FREE</span>
                          <span className="discount-label">SHIP</span>
                        </>
                      ) : discountPct ? (
                        <>
                          <span className="discount-number">{Number(discountPct)}%</span>
                          <span className="discount-unit">GIẢM</span>
                        </>
                      ) : (
                        <>
                          <span className="discount-number">HOT</span>
                          <span className="discount-unit">DEAL</span>
                        </>
                      )}
                    </div>
                    <span className="ticket-badge-tag">{item.badge || 'Ưu Đãi'}</span>
                  </div>

                  {/* ĐƯỜNG RÃNH RĂNG CƯA */}
                  <div className="voucher-ticket-divider"></div>

                  {/* CỘT PHẢI: CHI TIẾT & HÀNH ĐỘNG */}
                  <div className="voucher-ticket-right">
                    <div className="ticket-info-top">
                      <div className="ticket-code-pill">
                        <ion-icon name="pricetag"></ion-icon>
                        <span className="ticket-code-val">{code}</span>
                      </div>
                      <span className="ticket-expiry">HSD: 31/12/2026</span>
                    </div>

                    <h3 className="ticket-name">{name}</h3>
                    <p className="ticket-desc">{desc}</p>

                    <div className="ticket-conditions">
                      {minVal > 0 && (
                        <span className="condition-pill">
                          Đơn tối thiểu: <strong>{formatVND(minVal)}</strong>
                        </span>
                      )}
                      {maxDiscount && (
                        <span className="condition-pill">
                          Giảm tối đa: <strong>{formatVND(maxDiscount)}</strong>
                        </span>
                      )}
                    </div>

                    <div className="ticket-actions-row">
                      <button
                        type="button"
                        className={`ticket-copy-btn ${isCopied ? 'copied' : ''}`}
                        onClick={() => handleCopyCode(code)}
                      >
                        <ion-icon name={isCopied ? 'checkmark-circle' : 'copy-outline'}></ion-icon>
                        <span>{isCopied ? 'Đã sao chép ✓' : 'Sao chép mã'}</span>
                      </button>

                      <button
                        type="button"
                        className="ticket-use-btn"
                        onClick={() => navigate('/')}
                        title="Bắt đầu mua sắm bánh để dùng mã"
                      >
                        <span>Dùng ngay</span>
                        <ion-icon name="arrow-forward-outline"></ion-icon>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* HƯỚNG DẪN SỬ DỤNG VOUCHER */}
        <section className="vouchers-guide-section">
          <div className="guide-header">
            <ion-icon name="help-circle-outline"></ion-icon>
            <h2>Cách sử dụng mã giảm giá tại The Sweets</h2>
          </div>
          <div className="guide-steps-grid">
            <div className="guide-step-card">
              <span className="step-num">01</span>
              <h4>Chọn & Sao chép mã</h4>
              <p>Duyệt các chương trình khuyến mãi ở trên và bấm <strong>"Sao chép mã"</strong> mà bạn thích.</p>
            </div>
            <div className="guide-step-card">
              <span className="step-num">02</span>
              <h4>Chọn món bánh yêu thích</h4>
              <p>Chọn các món bánh ngon miệng cho vào giỏ hàng và tiến hành vào trang <strong>Thanh toán</strong>.</p>
            </div>
            <div className="guide-step-card">
              <span className="step-num">03</span>
              <h4>Áp dụng & Nhận giảm giá</h4>
              <p>Dán mã vào ô <strong>Voucher</strong> hoặc chọn trực tiếp trong danh sách để được trừ tiền ngay lập tức!</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

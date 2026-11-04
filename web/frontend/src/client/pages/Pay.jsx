import React, { useEffect, useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import { clientOrdersApi, clientPromotionsApi } from '../../api/client';
import { formatVND, apiErrorMessage, isOutOfStockError, toLocalDateInput } from '../../utils/format';
import popup from '../../utils/popup';
import { voucherDescription, voucherMinOrder, calcVoucherDiscount } from '../../utils/voucher';
import './Pay.css';

// Giờ mở cửa của tiệm (đồng bộ với App & Backend): giờ lấy bánh phải nằm trong khoảng này
const OPEN_TIME = '07:30';
const CLOSE_TIME = '21:30';
const OPENING_HOURS_LABEL = `${OPEN_TIME} - ${CLOSE_TIME}`;

const toTimeInput = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// Chuỗi "HH:mm" so sánh được trực tiếp
const isWithinOpeningHours = (timeStr) => timeStr >= OPEN_TIME && timeStr <= CLOSE_TIME;

// Thời điểm hợp lệ gần nhất: trước giờ mở thì lùi tới giờ mở, sau giờ đóng thì sang giờ mở hôm sau
const nextValidPickup = (d) => {
  const timeStr = toTimeInput(d);
  if (timeStr < OPEN_TIME) return { dateStr: toLocalDateInput(d), timeStr: OPEN_TIME };
  if (timeStr > CLOSE_TIME) {
    const tomorrow = new Date(d);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { dateStr: toLocalDateInput(tomorrow), timeStr: OPEN_TIME };
  }
  return { dateStr: toLocalDateInput(d), timeStr };
};

// Câu báo lỗi nếu giờ lấy bánh không hợp lệ, hợp lệ thì trả null
const pickupError = (dateStr, timeStr) => {
  const pickupAt = new Date(`${dateStr}T${timeStr}`);
  if (!dateStr || !timeStr || Number.isNaN(pickupAt.getTime())) return 'Vui lòng chọn ngày và giờ lấy bánh!';
  if (pickupAt < new Date()) return 'Giờ lấy bánh phải ở thời điểm sau hiện tại!';
  if (!isWithinOpeningHours(timeStr)) return `Giờ lấy bánh phải trong giờ mở cửa của tiệm (${OPENING_HOURS_LABEL})!`;
  return null;
};

// Đổi voucher từ API /client/promotions sang dạng dùng trong trang thanh toán
const toVoucher = (p) => ({
  code: p.promotion_code,
  name: p.promotion_name,
  desc: voucherDescription(p),
  minOrder: voucherMinOrder(p),
  calculateDiscount: (total) => calcVoucherDiscount(p, total),
});

export default function Pay() {
  const items = useCartStore(state => state.items);
  const fetchCart = useCartStore(state => state.fetchCart);
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();

  // Tính giờ mặc định sau 45 phút giống bên Mobile
  // Rơi ngoài giờ mở cửa thì dời tới giờ mở cửa gần nhất
  const getDefaultPickup = () => nextValidPickup(new Date(Date.now() + 45 * 60000));

  const defaultPickup = getDefaultPickup();

  // Thông tin tài khoản hiện tại của người dùng
  const myDefaultName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  const myDefaultPhone = user?.phone || '';

  const [shippingInfo, setShippingInfo] = useState({
    recipientMode: 'self', // 'self' (tôi tự nhận) hoặc 'other' (người khác nhận dùm)
    selfName: myDefaultName,
    selfPhone: myDefaultPhone,
    otherName: '',
    otherPhone: '',
    pickupDate: defaultPickup.dateStr,
    pickupTime: defaultPickup.timeStr,
    note: '',
    paymentMethod: 'COD' // 'COD' hoặc 'Banking'
  });

  const [isEditingSelfInfo, setIsEditingSelfInfo] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [customVoucherCode, setCustomVoucherCode] = useState('');
  // Chỉ gồm mã khách còn dùng được (server đã lọc mã hết hạn, tạm dừng, đã dùng hết lượt)
  const [vouchers, setVouchers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState(null);

  useEffect(() => {
    clientPromotionsApi
      .getAll()
      .then((res) => setVouchers((res.data || []).map(toVoucher)))
      .catch(() => setVouchers([]));
  }, [user?.phone]);

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Tính số tiền giảm giá của voucher hiện tại
  const discountAmount = selectedVoucher ? selectedVoucher.calculateDiscount(total) : 0;
  const finalTotal = Math.max(0, total - discountAmount);

  // Chọn nhanh mốc giờ lấy bánh (+30p, +1h, +2h)
  const setQuickPickupTime = (minutes) => {
    const target = new Date(Date.now() + minutes * 60000);
    const dateStr = toLocalDateInput(target);
    const timeStr = toTimeInput(target);
    if (!isWithinOpeningHours(timeStr)) {
      popup.warning(`Lúc đó tiệm đã đóng cửa (giờ mở cửa ${OPENING_HOURS_LABEL}), bạn chọn giờ khác nhé!`);
      return;
    }
    setShippingInfo({
      ...shippingInfo,
      pickupDate: dateStr,
      pickupTime: timeStr
    });
  };

  const handleSelectVoucher = (voucher) => {
    if (total < voucher.minOrder) {
      const needed = voucher.minOrder - total;
      popup.warning({
        title: "Chưa đủ điều kiện Voucher",
        message: `Đơn hàng cần đạt mức tối thiểu ${voucher.minOrder.toLocaleString('vi-VN')}₫ để áp dụng mã "${voucher.code}".`,
        subtitle: `Bạn cần mua thêm ${needed.toLocaleString('vi-VN')}₫ để hưởng ưu đãi.`,
      });
      return;
    }
    setSelectedVoucher(voucher);
    setIsVoucherModalOpen(false);
    popup.success(`Đã áp dụng mã voucher "${voucher.code}"!`);
  };

  const handleApplyCustomCode = async (e) => {
    e.preventDefault();
    const code = customVoucherCode.trim().toUpperCase();
    if (!code) return;
    const found = vouchers.find(v => v.code === code);
    if (found) {
      handleSelectVoucher(found);
      return;
    }
    // Mã không có trong danh sách: hỏi server để báo đúng lý do (hết hạn, đã dùng, hết lượt...)
    try {
      await clientPromotionsApi.apply({ promotion_code: code, order_amount: total });
      popup.warning("Mã voucher hiện không áp dụng được cho tài khoản của bạn.", { title: "Voucher không hợp lệ" });
    } catch (err) {
      popup.warning(apiErrorMessage(err, "Mã voucher không tồn tại hoặc đã hết hạn!"), { title: "Voucher không hợp lệ" });
    }
  };

  // Xác định họ tên & SĐT người nhận bánh cuối cùng
  const currentRecipientName = shippingInfo.recipientMode === 'self' 
    ? shippingInfo.selfName 
    : shippingInfo.otherName;
  
  const currentRecipientPhone = shippingInfo.recipientMode === 'self' 
    ? shippingInfo.selfPhone 
    : shippingInfo.otherPhone;

  const handlePay = async (e) => {
    e.preventDefault();
    if (shippingInfo.recipientMode === 'other') {
      if (!shippingInfo.otherName.trim() || !shippingInfo.otherPhone.trim()) {
        popup.warning("Vui lòng điền đầy đủ họ tên và số điện thoại của người nhận dùm!");
        return;
      }
    } else {
      if (!shippingInfo.selfName.trim() || !shippingInfo.selfPhone.trim()) {
        popup.warning("Vui lòng kiểm tra lại họ tên và số điện thoại của bạn!");
        return;
      }
    }

    const pickupMessage = pickupError(shippingInfo.pickupDate, shippingInfo.pickupTime);
    if (pickupMessage) {
      popup.warning(pickupMessage);
      return;
    }

    const noteText = (shippingInfo.note || "").trim();
    if (noteText) {
      if (noteText.length > 200) {
        popup.warning("Ghi chú cho tiệm bánh không được vượt quá 200 ký tự!");
        return;
      }
      const noteWords = noteText.split(/\s+/).filter(Boolean);
      if (noteWords.length > 50) {
        popup.warning("Ghi chú cho tiệm bánh chỉ giới hạn tối đa 50 chữ!");
        return;
      }
      if (noteWords.some((w) => w.length > 25)) {
        popup.warning("Ghi chú chứa từ quá dài không hợp lệ (tối đa 25 ký tự liên tục)!");
        return;
      }
      if (/(.)\1{4,}/.test(noteText)) {
        popup.warning("Ghi chú chứa ký tự lặp lại vô nghĩa!");
        return;
      }
    }

    const recipientDesc = shippingInfo.recipientMode === 'self'
      ? `${currentRecipientName} (${currentRecipientPhone})`
      : `${currentRecipientName} [Nhận hộ] (${currentRecipientPhone})`;

    setSubmitting(true);
    try {
      // Đơn được tạo từ giỏ hàng trên server (bảng cart), server tự xóa giỏ sau khi đặt
      const res = await clientOrdersApi.createOrder({
        recipient_name: currentRecipientName.trim(),
        recipient_phone: currentRecipientPhone.trim(),
        pickup_time: `${shippingInfo.pickupDate}T${shippingInfo.pickupTime}:00`,
        notes: shippingInfo.note.trim() || null,
        payment_method: shippingInfo.paymentMethod,
        voucher_code: selectedVoucher ? selectedVoucher.code : undefined,
      });
      const order = res.data;
      setOrderSuccessModal({
        order_code: order.order_code,
        recipient_desc: recipientDesc,
        store_address: 'The Sweets Bakery (120 Hai Bà Trưng, Quận 1)',
        pickup_time: `${shippingInfo.pickupTime} ngày ${shippingInfo.pickupDate}`,
        payment_method_label: shippingInfo.paymentMethod === 'COD'
          ? 'Tiền mặt khi nhận bánh'
          : 'Chuyển khoản ngân hàng · Đã thanh toán thành công',
        final_cost: order.final_cost,
      });
      await fetchCart();
    } catch (err) {
      if (isOutOfStockError(err)) {
        // Bánh vừa được khách khác mua trước: báo hết hàng (không phải lỗi hệ thống) và tải lại giỏ để thấy tồn kho mới
        popup.warning(apiErrorMessage(err), { title: "Sản phẩm đã hết", duration: 7000 });
        fetchCart().catch(() => {});
      } else {
        popup.error(apiErrorMessage(err, "Đặt bánh thất bại, vui lòng thử lại."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const eligibleVouchersCount = vouchers.filter(v => total >= v.minOrder).length;
  const pickupMessage = pickupError(shippingInfo.pickupDate, shippingInfo.pickupTime);

  if (!user) return <Navigate to="/login" replace />;

  if (items.length === 0 && !orderSuccessModal) {
    return (
      <div className="pay-page-wrapper">
        <div className="pay-container" style={{ textAlign: 'center', padding: '60px 16px' }}>
          <h1 className="pay-main-title">Giỏ hàng đang trống</h1>
          <p className="pay-subtitle">Hãy chọn vài món bánh trước khi đặt hàng nhé.</p>
          <Link to="/products" className="pay-continue-shop-link">← Tiếp tục chọn bánh</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pay-page-wrapper">
      <div className="pay-container">

        {/* Tiêu đề & quay lại */}
        <div className="pay-header-area">
          <div>
            <h1 className="pay-main-title">Xác nhận đơn & Lấy bánh tại tiệm</h1>
            <p className="pay-subtitle">Mô hình nhận bánh trực tiếp tại quầy The Sweets (Pick-up)</p>
          </div>
          <Link to="/products" className="pay-continue-shop-link">
            ← Tiếp tục chọn bánh
          </Link>
        </div>

        <form onSubmit={handlePay} className="pay-layout-grid">
          
          {/* CỘT TRÁI: FORM ĐẶT BÁNH */}
          <div className="pay-left-column">

            {/* 1. THỜI GIAN LẤY BÁNH TẠI TIỆM (PICK-UP) */}
            <div className="pay-card-section">
              <div className="pay-section-header">
                <h2 className="pay-section-title">
                  <span className="step-num">1</span>
                  Thời gian lấy bánh (Pick-up)
                </h2>
                <span className="store-badge">📍 Tại tiệm: The Sweets Bakery</span>
              </div>

              <div className="store-location-notice">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <span>Địa chỉ nhận bánh: <strong>120 Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP.HCM</strong></span>
              </div>

              {/* Box chọn ngày & giờ */}
              <div className="pickup-time-box">
                <div className="pickup-inputs-row">
                  <div className="pay-form-group">
                    <label>Ngày lấy bánh *</label>
                    <input 
                      type="date" 
                      required 
                      value={shippingInfo.pickupDate}
                      onChange={e => setShippingInfo({...shippingInfo, pickupDate: e.target.value})}
                    />
                  </div>

                  <div className="pay-form-group">
                    <label>Giờ hẹn lấy bánh *</label>
                    <input 
                      type="time" 
                      required 
                      min={OPEN_TIME}
                      max={CLOSE_TIME}
                      value={shippingInfo.pickupTime}
                      onChange={e => setShippingInfo({...shippingInfo, pickupTime: e.target.value})}
                    />
                  </div>
                </div>

                {/* Các nút chọn nhanh */}
                <div className="quick-time-chips">
                  <span className="chips-label">Chọn nhanh:</span>
                  <button type="button" onClick={() => setQuickPickupTime(30)} className="time-chip-btn">
                    + Sau 30 phút
                  </button>
                  <button type="button" onClick={() => setQuickPickupTime(60)} className="time-chip-btn">
                    + Sau 1 tiếng
                  </button>
                  <button type="button" onClick={() => setQuickPickupTime(120)} className="time-chip-btn">
                    + Sau 2 tiếng
                  </button>
                </div>

                {pickupMessage ? (
                  <p className="pickup-hours-note error">{pickupMessage}</p>
                ) : (
                  <p className="pickup-hours-note">Giờ mở cửa tiệm: {OPENING_HOURS_LABEL} (tất cả các ngày)</p>
                )}
              </div>
            </div>

            {/* 2. THÔNG TIN NGƯỜI NHẬN BÁNH (ĐƯỢC ĐỔI LÊN TRƯỚC THANH TOÁN) */}
            <div className="pay-card-section" style={{ marginTop: '20px' }}>
              <div className="pay-section-header">
                <h2 className="pay-section-title">
                  <span className="step-num">2</span>
                  Thông tin người nhận bánh
                </h2>
              </div>

              {/* Nút chọn: Tôi tự nhận (Thông tin hiện tại) HOẶC Đổi người khác nhận dùm */}
              <div className="recipient-mode-selector">
                <button
                  type="button"
                  className={`recipient-tab-btn ${shippingInfo.recipientMode === 'self' ? 'active' : ''}`}
                  onClick={() => setShippingInfo({ ...shippingInfo, recipientMode: 'self' })}
                >
                  <span className="radio-circle"></span>
                  <div className="tab-btn-content">
                    <strong>Tôi tự nhận bánh</strong>
                    <small>Sử dụng thông tin tài khoản hiện tại</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={`recipient-tab-btn ${shippingInfo.recipientMode === 'other' ? 'active' : ''}`}
                  onClick={() => setShippingInfo({ ...shippingInfo, recipientMode: 'other' })}
                >
                  <span className="radio-circle"></span>
                  <div className="tab-btn-content">
                    <strong>Người khác nhận dùm</strong>
                    <small>Nhập thông tin người nhận hộ</small>
                  </div>
                </button>
              </div>

              {/* TRƯỜNG HỢP 1: TÔI TỰ NHẬN (THÔNG TIN HIỆN TẠI) */}
              {shippingInfo.recipientMode === 'self' && (
                <div className="self-recipient-container">
                  {!isEditingSelfInfo ? (
                    <div className="current-user-card">
                      <div className="user-icon-bubble">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      </div>
                      <div className="user-info-text">
                        <div className="user-title-line">
                          <strong className="user-name">{shippingInfo.selfName}</strong>
                          <span className="account-tag">Tài khoản hiện tại</span>
                        </div>
                        <span className="user-phone">Số điện thoại: <strong>{shippingInfo.selfPhone}</strong></span>
                      </div>
                      <button 
                        type="button" 
                        className="btn-edit-self"
                        onClick={() => setIsEditingSelfInfo(true)}
                      >
                        Chỉnh sửa
                      </button>
                    </div>
                  ) : (
                    <div className="edit-self-form">
                      <div className="pay-form-row">
                        <div className="pay-form-group">
                          <label>Họ tên của bạn *</label>
                          <input 
                            type="text" 
                            required 
                            value={shippingInfo.selfName}
                            onChange={e => setShippingInfo({...shippingInfo, selfName: e.target.value})}
                          />
                        </div>
                        <div className="pay-form-group">
                          <label>Số điện thoại *</label>
                          <input 
                            type="tel" 
                            required 
                            value={shippingInfo.selfPhone}
                            onChange={e => setShippingInfo({...shippingInfo, selfPhone: e.target.value})}
                          />
                        </div>
                      </div>
                      <button 
                        type="button" 
                        className="btn-save-self"
                        onClick={() => setIsEditingSelfInfo(false)}
                      >
                        Lưu thông tin
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TRƯỜNG HỢP 2: NGƯỜI KHÁC NHẬN DÙM */}
              {shippingInfo.recipientMode === 'other' && (
                <div className="other-recipient-container">
                  <div className="other-notice-banner">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <span>Vui lòng điền đúng thông tin người đến tiệm nhận bánh hộ để nhân viên quầy đối soát chính xác.</span>
                  </div>

                  <div className="pay-form-row">
                    <div className="pay-form-group">
                      <label>Họ tên người nhận dùm *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="VD: Trần Thị Mai"
                        value={shippingInfo.otherName}
                        onChange={e => setShippingInfo({...shippingInfo, otherName: e.target.value})}
                      />
                    </div>

                    <div className="pay-form-group">
                      <label>Số điện thoại người nhận dùm *</label>
                      <input 
                        type="tel" 
                        required 
                        placeholder="VD: 0988776655"
                        value={shippingInfo.otherPhone}
                        onChange={e => setShippingInfo({...shippingInfo, otherPhone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Ghi chú chung cho đơn hàng */}
              <div className="pay-form-group" style={{ marginBottom: 0, marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>Ghi chú cho tiệm bánh (tùy chọn)</label>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: (shippingInfo.note || "").length >= 200 ? '#ef4444' : '#64748b' }}>
                    {(shippingInfo.note || "").trim().split(/\s+/).filter(Boolean).length}/50 chữ · {(shippingInfo.note || "").length}/200 ký tự
                  </span>
                </div>
                <textarea 
                  rows="2"
                  maxLength={200}
                  placeholder="VD: Viết chữ 'Happy Birthday', thêm nến số 25... (Tối đa 50 chữ, 200 ký tự)"
                  value={shippingInfo.note}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.length > 200) return;
                    const words = val.trim().split(/\s+/).filter(Boolean);
                    if (words.length > 50) {
                      const trimmed = words.slice(0, 50).join(" ");
                      setShippingInfo({...shippingInfo, note: trimmed});
                      popup.warning("Ghi chú cho tiệm bánh chỉ giới hạn tối đa 50 chữ!");
                      return;
                    }
                    setShippingInfo({...shippingInfo, note: val});
                  }}
                ></textarea>
              </div>
            </div>

            {/* 3. HÌNH THỨC THANH TOÁN (COD HOẶC CHUYỂN KHOẢN BANKING) */}
            <div className="pay-card-section" style={{ marginTop: '20px' }}>
              <h2 className="pay-section-title">
                <span className="step-num">3</span>
                Hình thức thanh toán
              </h2>

              <div className="pay-method-options">
                {/* Lựa chọn 1: Tiền mặt COD */}
                <label className={`pay-method-card ${shippingInfo.paymentMethod === 'COD' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="COD" 
                    checked={shippingInfo.paymentMethod === 'COD'}
                    onChange={e => setShippingInfo({...shippingInfo, paymentMethod: e.target.value})}
                  />
                  <div className="method-info">
                    <strong>Tiền mặt khi nhận bánh (COD)</strong>
                    <span>Thanh toán trực tiếp bằng tiền mặt khi tới quầy lấy bánh</span>
                  </div>
                </label>

                {/* Lựa chọn 2: Chuyển khoản ngân hàng Banking */}
                <label className={`pay-method-card ${shippingInfo.paymentMethod === 'Banking' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="Banking" 
                    checked={shippingInfo.paymentMethod === 'Banking'}
                    onChange={e => setShippingInfo({...shippingInfo, paymentMethod: e.target.value})}
                  />
                  <div className="method-info">
                    <strong>Chuyển khoản ngân hàng (Banking)</strong>
                    <span>Thanh toán ngay khi đặt, không cần trả tiền khi nhận bánh</span>
                  </div>
                </label>
              </div>

            </div>

          </div>

          {/* CỘT PHẢI: TỔNG KẾT ĐƠN HÀNG */}
          <div className="pay-right-column">
            <div className="pay-summary-card">
              <h2 className="pay-section-title">
                Tóm tắt đơn hàng ({items.reduce((s, i) => s + i.quantity, 0)} món)
              </h2>

              {/* Danh sách món */}
              <div className="pay-items-list">
                {items.map((item, i) => (
                  <div key={i} className="pay-item-row">
                    <img 
                      src={item.image} 
                      alt={item.product_name} 
                      className="pay-item-img"
                      onError={e => { e.target.src = '/assets/Img/Sweets1.png'; }}
                    />
                    <div className="pay-item-details">
                      <h4 className="pay-item-name">{item.product_name}</h4>
                      <span className="pay-item-size">Size: {item.size_name}</span>
                      <span className="pay-item-qty">SL: {item.quantity} x {Number(item.price).toLocaleString('vi-VN')}₫</span>
                      {item.stock_quantity != null && item.quantity > item.stock_quantity && (
                        <span className="pay-item-stock-warn">
                          {item.stock_quantity <= 0
                            ? 'Đã hết hàng — đã có khách khác mua trước'
                            : `Chỉ còn ${item.stock_quantity} cái, vui lòng giảm số lượng`}
                        </span>
                      )}
                    </div>
                    <div className="pay-item-total">
                      {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                    </div>
                  </div>
                ))}
              </div>

              {/* KHU VỰC CHỌN VOUCHER */}
              <div className="pay-voucher-trigger-box">
                <div 
                  className={`voucher-selector-card ${selectedVoucher ? 'has-voucher' : ''}`}
                  onClick={() => setIsVoucherModalOpen(true)}
                >
                  <div className="voucher-card-left">
                    <span className="voucher-ticket-icon">🎟️</span>
                    {selectedVoucher ? (
                      <div className="voucher-selected-info">
                        <div className="voucher-code-row">
                          <span className="voucher-pill">{selectedVoucher.code}</span>
                          <span className="voucher-name-label">{selectedVoucher.name}</span>
                        </div>
                        <span className="voucher-amount-highlight">
                          Đã giảm {discountAmount.toLocaleString('vi-VN')}₫
                        </span>
                      </div>
                    ) : (
                      <div className="voucher-unselected-info">
                        <strong>Chọn Voucher ưu đãi</strong>
                        <span>{eligibleVouchersCount} mã giảm giá khả dụng</span>
                      </div>
                    )}
                  </div>

                  <div className="voucher-card-right">
                    {selectedVoucher ? (
                      <button 
                        type="button" 
                        className="btn-change-voucher"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsVoucherModalOpen(true);
                        }}
                      >
                        Đổi mã
                      </button>
                    ) : (
                      <span className="btn-open-vouchers">
                        Chọn mã →
                      </span>
                    )}
                  </div>
                </div>

                {selectedVoucher && (
                  <div className="voucher-active-banner">
                    <span>✓ Áp dụng mã <strong>{selectedVoucher.code}</strong> (-{discountAmount.toLocaleString('vi-VN')}₫)</span>
                    <button 
                      type="button" 
                      onClick={() => setSelectedVoucher(null)} 
                      className="btn-remove-selected-voucher"
                      title="Bỏ chọn mã"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                )}
              </div>

              {/* Bảng tính tổng tiền */}
              <div className="pay-cost-calc">
                <div className="cost-line">
                  <span>Tạm tính:</span>
                  <span>{total.toLocaleString('vi-VN')}₫</span>
                </div>
                
                {discountAmount > 0 && (
                  <div className="cost-line discount-line">
                    <span>Voucher ({selectedVoucher?.code}):</span>
                    <span>-{discountAmount.toLocaleString('vi-VN')}₫</span>
                  </div>
                )}

                <div className="cost-line">
                  <span>Hình thức:</span>
                  <span className="pickup-free-tag">Miễn phí (Nhận tại quầy)</span>
                </div>

                <div className="cost-line grand-total">
                  <span>Tổng thanh toán:</span>
                  <span className="total-amount">{finalTotal.toLocaleString('vi-VN')}₫</span>
                </div>
              </div>

              <button type="submit" className="pay-submit-btn" disabled={submitting}>
                {submitting ? 'Đang đặt bánh...' : 'Xác nhận đặt bánh'}
              </button>

              <div className="pay-commitment-note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <span>Bánh được giữ lạnh và chuẩn bị sẵn sàng đúng hẹn khi bạn tới.</span>
              </div>
            </div>
          </div>

        </form>

        {/* MODAL DANH SÁCH VOUCHER */}
        {isVoucherModalOpen && (
          <div className="voucher-modal-backdrop" onClick={() => setIsVoucherModalOpen(false)}>
            <div className="voucher-modal-window" onClick={e => e.stopPropagation()}>
              
              <div className="voucher-modal-header">
                <div>
                  <h3 className="modal-title">Chọn Voucher Ưu Đãi</h3>
                  <p className="modal-sub">Chọn 1 mã ưu đãi áp dụng cho đơn bánh của bạn</p>
                </div>
                <button 
                  type="button" 
                  className="modal-close-btn" 
                  onClick={() => setIsVoucherModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              {/* Danh sách các voucher */}
              <div className="voucher-cards-list">
                {vouchers.length === 0 && (
                  <p className="modal-sub" style={{ textAlign: 'center', padding: '16px 0' }}>Hiện chưa có voucher nào dành cho bạn.</p>
                )}
                {vouchers.map(v => {
                  const isEligible = total >= v.minOrder;
                  const isCurrent = selectedVoucher?.code === v.code;
                  const discount = v.calculateDiscount(total);
                  const needed = v.minOrder - total;

                  return (
                    <div 
                      key={v.code}
                      className={`voucher-item-card ${isCurrent ? 'active' : ''} ${!isEligible ? 'ineligible' : ''}`}
                      onClick={() => isEligible && handleSelectVoucher(v)}
                    >
                      <div className="voucher-item-left">
                        <div className="voucher-code-badge">{v.code}</div>
                        <div className="voucher-item-texts">
                          <h4 className="voucher-item-name">{v.name}</h4>
                          <p className="voucher-item-desc">{v.desc}</p>
                          
                          {isEligible ? (
                            <span className="voucher-eligibility eligible">
                              ✓ Tiết kiệm được: <strong>{discount.toLocaleString('vi-VN')}₫</strong>
                            </span>
                          ) : (
                            <span className="voucher-eligibility not-enough">
                              Cần mua thêm {needed.toLocaleString('vi-VN')}₫ để áp dụng
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="voucher-item-right">
                        {isCurrent ? (
                          <span className="voucher-applied-pill">✓ Đang dùng</span>
                        ) : isEligible ? (
                          <button 
                            type="button" 
                            className="voucher-select-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectVoucher(v);
                            }}
                          >
                            Áp dụng
                          </button>
                        ) : (
                          <button type="button" disabled className="voucher-disabled-btn">
                            Chưa đủ ĐK
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ô nhập mã thủ công */}
              <div className="modal-manual-code-box">
                <span className="manual-label">Hoặc nhập mã riêng:</span>
                <div className="manual-input-row">
                  <input 
                    type="text" 
                    placeholder="Nhập mã voucher khác"
                    value={customVoucherCode}
                    onChange={e => setCustomVoucherCode(e.target.value)}
                  />
                  <button type="button" onClick={handleApplyCustomCode} className="manual-apply-btn">
                    Áp dụng
                  </button>
                </div>
              </div>

              <div className="voucher-modal-footer">
                {selectedVoucher && (
                  <button 
                    type="button" 
                    className="modal-remove-voucher-btn"
                    onClick={() => {
                      setSelectedVoucher(null);
                      setIsVoucherModalOpen(false);
                    }}
                  >
                    Bỏ chọn voucher
                  </button>
                )}
                <button 
                  type="button" 
                  className="modal-confirm-btn"
                  onClick={() => setIsVoucherModalOpen(false)}
                >
                  Xong
                </button>
              </div>

            </div>
          </div>
        )}

        {/* POPUP MODAL ĐẶT HÀNG THÀNH CÔNG */}
        {orderSuccessModal && (
          <div className="order-success-modal-backdrop">
            <div className="order-success-modal-window" onClick={e => e.stopPropagation()}>
              <div className="order-success-icon-wrap">
                <ion-icon name="checkmark-outline"></ion-icon>
              </div>

              <h2 className="order-success-title">Đặt Bánh Thành Công!</h2>
              <p className="order-success-desc">
                Cảm ơn bạn đã lựa chọn tiệm bánh The Sweets! Đơn hàng của bạn đã được ghi nhận và đang chuẩn bị sẵn sàng.
              </p>

              <div className="order-success-details-card">
                <div className="order-success-row">
                  <span className="label">Mã đơn hàng:</span>
                  <span className="value">
                    <span className="order-success-code-badge">#{orderSuccessModal.order_code}</span>
                  </span>
                </div>
                <div className="order-success-row">
                  <span className="label">Người nhận bánh:</span>
                  <span className="value">{orderSuccessModal.recipient_desc}</span>
                </div>
                <div className="order-success-row">
                  <span className="label">Nơi nhận bánh:</span>
                  <span className="value">{orderSuccessModal.store_address}</span>
                </div>
                <div className="order-success-row">
                  <span className="label">Thời gian lấy bánh:</span>
                  <span className="value">{orderSuccessModal.pickup_time}</span>
                </div>
                <div className="order-success-row">
                  <span className="label">Hình thức:</span>
                  <span className="value">{orderSuccessModal.payment_method_label}</span>
                </div>
                <div className="order-success-row order-success-row-total">
                  <span className="label" style={{ fontWeight: '700', color: '#1e293b' }}>Tổng thanh toán:</span>
                  <span className="order-success-total-price">{formatVND(orderSuccessModal.final_cost)}</span>
                </div>
              </div>

              <div className="order-success-actions">
                <button
                  type="button"
                  className="order-success-btn-home"
                  onClick={() => navigate('/')}
                >
                  <ion-icon name="arrow-back-outline"></ion-icon>
                  <span>Quay về trang chủ</span>
                </button>
                <button
                  type="button"
                  className="order-success-btn-receipt"
                  onClick={() => navigate('/receipt')}
                >
                  <ion-icon name="receipt-outline"></ion-icon>
                  <span>Qua xem hóa đơn</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

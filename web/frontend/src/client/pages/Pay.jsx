import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import { clientOrdersApi, clientPromotionsApi } from '../../api/client';
import { formatVND, apiErrorMessage, isOutOfStockError, toLocalDateInput } from '../../utils/format';
import popup from '../../utils/popup';
import { saveBlob, downloadErrorMessage } from '../../utils/download';
import { voucherDescription, voucherMinOrder, calcVoucherDiscount, calcSingleUseDiscount } from '../../utils/voucher';
import { dealLabel, hasDeal } from '../../utils/deal';
import './Pay.css';

// Giờ mở cửa của tiệm (đồng bộ với App & Backend): giờ lấy bánh phải nằm trong khoảng này
const OPEN_TIME = '07:30';
const CLOSE_TIME = '21:30';
const OPENING_HOURS_LABEL = `${OPEN_TIME} - ${CLOSE_TIME}`;

const PHONE_RE = /^0\d{9}$/;

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

// Mã dùng 1 lần là mã riêng (không nằm trong danh sách): dựng từ kết quả kiểm tra mã của server
const toSingleUseVoucher = (r) => ({
  code: r.promotion_code,
  name: r.promotion_name,
  desc: r.description,
  minOrder: Number(r.single_use.min_order_value || 0),
  singleUse: true,
  calculateDiscount: (total) => calcSingleUseDiscount(r.single_use, total),
});

// Mã trong ví voucher của khách đã đăng nhập (API /client/promotions/saved)
const toSavedVoucher = (s) => ({
  ...toSingleUseVoucher({ promotion_code: s.code, promotion_name: s.name, description: s.description, single_use: s.single_use }),
  voucherId: s.voucher_id,
});

// Khách chưa đăng nhập: mã đang chọn chỉ nhớ tạm trong sessionStorage của tab
// (tải lại trang / đi chọn thêm bánh vẫn còn, đóng tab hoặc trình duyệt là quên; không lưu lên server)
const GUEST_VOUCHER_KEY = 'pay-guest-voucher-code';
const readGuestVoucher = () => {
  try { return sessionStorage.getItem(GUEST_VOUCHER_KEY) || ''; } catch { return ''; }
};
const writeGuestVoucher = (code) => {
  try {
    if (code) sessionStorage.setItem(GUEST_VOUCHER_KEY, code);
    else sessionStorage.removeItem(GUEST_VOUCHER_KEY);
  } catch {
    // Trình duyệt chặn lưu trữ: chỉ mất tính năng nhớ mã, trang vẫn dùng bình thường
  }
};

export default function Pay() {
  const items = useCartStore(state => state.items);
  const fetchCart = useCartStore(state => state.fetchCart);
  const user = useAuthStore(state => state.user);
  // Khách chưa đăng nhập: tự nhập thông tin người đặt, đơn gửi kèm các món trong giỏ tạm của trình duyệt
  const isGuest = !user;
  const resetLocalCart = useCartStore(state => state.resetLocal);
  const revalidateGuestCart = useCartStore(state => state.revalidateGuestCart);
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
  const [vouchersLoaded, setVouchersLoaded] = useState(false);
  // Ví voucher của khách đã đăng nhập (mã dùng 1 lần đã nhập, chưa dùng)
  const [savedVouchers, setSavedVouchers] = useState([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState(null);
  // Chỉ tự áp lại mã đã nhớ 1 lần khi mở trang; trước đó không ghi đè mã đang nhớ
  const restoredRef = useRef(false);

  useEffect(() => {
    clientPromotionsApi
      .getAll()
      .then((res) => setVouchers((res.data || []).map(toVoucher)))
      .catch(() => setVouchers([]))
      .finally(() => setVouchersLoaded(true));
  }, [user?.phone]);

  const loadSaved = useCallback(() =>
    clientPromotionsApi
      .getSaved()
      .then((res) => setSavedVouchers((res.data || []).map(toSavedVoucher)))
      .catch(() => setSavedVouchers([]))
      .finally(() => setSavedLoaded(true)), []);

  useEffect(() => {
    if (!user) {
      setSavedVouchers([]);
      return;
    }
    // Vừa đăng nhập từ trang này (VD: SĐT đã có tài khoản): mã nhớ tạm lúc chưa đăng nhập được lưu vào tài khoản
    const guestCode = readGuestVoucher();
    writeGuestVoucher('');
    (guestCode ? clientPromotionsApi.saveVoucher(guestCode).catch(() => {}) : Promise.resolve()).then(loadSaved);
  }, [user, loadSaved]);

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  // Số tiền khách đã được giảm nhờ khuyến mãi sản phẩm, giá trong giỏ đã là giá sau giảm
  const productSavings = items.reduce(
    (sum, item) => sum + (hasDeal(item.price, item.original_price) ? (item.original_price - item.price) * item.quantity : 0),
    0
  );
  
  // Tính số tiền giảm giá của voucher hiện tại
  const discountAmount = selectedVoucher ? selectedVoucher.calculateDiscount(total) : 0;
  // Giỏ giảm xuống dưới mức tối thiểu của mã đang chọn: số tiền còn thiếu (0 = mã vẫn dùng được)
  const voucherShortfall = selectedVoucher ? Math.max(0, selectedVoucher.minOrder - total) : 0;
  const finalTotal = Math.max(0, total - discountAmount);

  // Mở trang thanh toán: tự áp lại mã đã nhớ
  // - Chưa đăng nhập: mã nhớ tạm trong tab (server kiểm tra lại, mã không còn dùng được thì quên)
  // - Đã đăng nhập: mã mới lưu gần nhất trong ví mà đơn hiện tại đủ điều kiện
  useEffect(() => {
    if (restoredRef.current || items.length === 0) return;
    if (isGuest) {
      if (!vouchersLoaded) return;
      restoredRef.current = true;
      const code = readGuestVoucher();
      if (!code) return;
      const found = vouchers.find((v) => v.code === code);
      if (found) {
        if (total >= found.minOrder) setSelectedVoucher(found);
        return;
      }
      clientPromotionsApi
        .apply({ promotion_code: code, order_amount: total })
        .then((res) => {
          if (res.data?.kind === 'single_use') setSelectedVoucher(toSingleUseVoucher(res.data));
          else writeGuestVoucher('');
        })
        .catch(() => writeGuestVoucher(''));
    } else {
      if (!savedLoaded) return;
      restoredRef.current = true;
      const latest = savedVouchers.find((v) => total >= v.minOrder);
      if (latest) setSelectedVoucher((cur) => cur || latest);
    }
  }, [isGuest, vouchersLoaded, savedLoaded, vouchers, savedVouchers, items.length, total]);

  // Bỏ chọn mã: khách chưa đăng nhập thì quên luôn mã đang nhớ tạm (mã trong ví tài khoản vẫn giữ)
  const clearSelectedVoucher = () => {
    setSelectedVoucher(null);
    if (isGuest) writeGuestVoucher('');
  };

  const handleRemoveSaved = async (v) => {
    try {
      await clientPromotionsApi.removeSaved(v.voucherId);
      if (selectedVoucher?.code === v.code) setSelectedVoucher(null);
      await loadSaved();
      popup.success(`Đã xóa mã ${v.code} khỏi danh sách đã lưu`);
    } catch (err) {
      popup.error(apiErrorMessage(err, 'Không xóa được mã, vui lòng thử lại.'));
    }
  };

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

  const handleSelectVoucher = (voucher, successNote = '') => {
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
    if (isGuest) writeGuestVoucher(voucher.code);
    setIsVoucherModalOpen(false);
    popup.success(`Đã áp dụng mã voucher "${voucher.code}"!${successNote}`);
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
    // Mã không có trong danh sách: hỏi server — có thể là mã dùng 1 lần, hoặc báo đúng lý do (hết hạn, đã dùng, hết lượt...)
    try {
      const res = await clientPromotionsApi.apply({ promotion_code: code, order_amount: total });
      if (res.data?.kind === 'single_use') {
        setCustomVoucherCode('');
        if (isGuest) {
          handleSelectVoucher(toSingleUseVoucher(res.data));
          return;
        }
        // Đã đăng nhập: lưu mã vào tài khoản để lần sau dùng tiếp nếu chưa dùng
        const saved = await clientPromotionsApi.saveVoucher(code).then(() => true).catch(() => false);
        handleSelectVoucher(toSingleUseVoucher(res.data), saved ? ' Mã đã được lưu vào tài khoản.' : '');
        if (saved) loadSaved();
        return;
      }
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
    if (voucherShortfall > 0) {
      popup.warning({
        title: "Mã giảm giá chưa đủ điều kiện",
        message: `Đơn hàng cần mua thêm ${voucherShortfall.toLocaleString('vi-VN')}₫ để dùng mã "${selectedVoucher.code}".`,
        subtitle: 'Bạn chọn thêm bánh hoặc bấm "Bỏ chọn" mã để đặt hàng.',
      });
      return;
    }
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
    if (isGuest) {
      // Khách không đăng nhập phải nhập đủ thông tin người đặt (thay cho thông tin tài khoản)
      if (shippingInfo.selfName.trim().length < 2 || !shippingInfo.selfPhone.trim()) {
        popup.warning("Vui lòng nhập họ tên và số điện thoại của bạn (người đặt bánh)!");
        return;
      }
      const phones = [shippingInfo.selfPhone, currentRecipientPhone].map((p) => p.replace(/\s+/g, ''));
      if (phones.some((p) => !PHONE_RE.test(p))) {
        popup.warning("Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0!");
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
      const orderData = {
        recipient_name: currentRecipientName.trim(),
        recipient_phone: currentRecipientPhone.replace(/\s+/g, ''),
        pickup_time: `${shippingInfo.pickupDate}T${shippingInfo.pickupTime}:00`,
        notes: shippingInfo.note.trim() || null,
        payment_method: shippingInfo.paymentMethod,
        voucher_code: selectedVoucher ? selectedVoucher.code : undefined,
      };
      // Đã đăng nhập: đơn tạo từ giỏ hàng trên server (bảng cart), server tự xóa giỏ sau khi đặt.
      // Khách vãng lai: gửi kèm thông tin người đặt và các món trong giỏ tạm
      const res = isGuest
        ? await clientOrdersApi.createGuestOrder({
            ...orderData,
            customer_name: shippingInfo.selfName.trim(),
            customer_phone: shippingInfo.selfPhone.replace(/\s+/g, ''),
            items: items.map((i) => ({ product_id: i.product_id, size_id: i.size_id, quantity: i.quantity })),
          })
        : await clientOrdersApi.createOrder(orderData);
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
        guest_phone: isGuest ? shippingInfo.selfPhone.replace(/\s+/g, '') : null,
        order_id: order.order_id,
        // Khách vãng lai không có token đăng nhập: server cấp token riêng để tải hóa đơn của đơn này
        invoice_token: order.invoice_token || null,
      });
      // Mã đã dùng: khách vãng lai quên mã nhớ tạm; ví của khách đăng nhập tự ẩn mã đã dùng
      if (isGuest) {
        writeGuestVoucher('');
        resetLocalCart();
      } else {
        loadSaved();
        await fetchCart();
      }
    } catch (err) {
      if (isOutOfStockError(err)) {
        // Bánh vừa được khách khác mua trước: báo hết hàng (không phải lỗi hệ thống) và tải lại giỏ để thấy tồn kho mới
        popup.warning(apiErrorMessage(err), { title: "Sản phẩm đã hết", duration: 7000 });
        (isGuest ? revalidateGuestCart() : fetchCart()).catch(() => {});
      } else if (err?.response?.data?.code === 'ACCOUNT_EXISTS') {
        // SĐT đã có tài khoản: mời đăng nhập; giỏ tạm được đẩy lên tài khoản rồi quay lại trang này
        const goLogin = await popup.confirm({
          title: "Số điện thoại đã có tài khoản",
          message: apiErrorMessage(err),
          subtitle: "Các món trong giỏ sẽ được giữ nguyên sau khi đăng nhập.",
          confirmText: "Đăng nhập",
          cancelText: "Để sau",
          type: "warning",
          icon: "lock",
        });
        if (goLogin) navigate('/login', { state: { from: '/pay' } });
      } else {
        popup.error(apiErrorMessage(err, "Đặt bánh thất bại, vui lòng thử lại."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Tải hóa đơn PDF ngay trong modal đặt hàng thành công (khách vãng lai dùng invoice_token)
  const handleDownloadInvoice = async () => {
    const o = orderSuccessModal;
    if (!o) return;
    setDownloadingInvoice(true);
    try {
      const blob = o.invoice_token
        ? await clientOrdersApi.downloadGuestInvoice(o.order_id, o.invoice_token)
        : await clientOrdersApi.downloadInvoice(o.order_id);
      saveBlob(blob, `hoa-don-${o.order_code}.pdf`);
    } catch (err) {
      popup.error(await downloadErrorMessage(err, 'Không tải được hóa đơn, vui lòng thử lại.'));
    } finally {
      setDownloadingInvoice(false);
    }
  };

  // Gồm cả mã trong ví (khách đã đăng nhập)
  const eligibleVouchersCount = [...vouchers, ...(isGuest ? [] : savedVouchers)].filter(v => total >= v.minOrder).length;
  const pickupMessage = pickupError(shippingInfo.pickupDate, shippingInfo.pickupTime);

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

              {/* Khách chưa đăng nhập: nhập tay thông tin người đặt (thay cho thông tin tài khoản) */}
              {isGuest && (
                <div className="guest-buyer-box">
                  <div className="guest-buyer-notice">
                    Bạn đang đặt bánh không cần tài khoản.{' '}
                    <Link to="/login" state={{ from: '/pay' }}>Đăng nhập</Link> để dùng thông tin đã lưu và theo dõi đơn hàng.
                  </div>
                  <div className="pay-form-row">
                    <div className="pay-form-group">
                      <label>Họ tên của bạn *</label>
                      <input
                        type="text"
                        required
                        maxLength={100}
                        autoComplete="name"
                        placeholder="VD: Nguyễn Văn An"
                        value={shippingInfo.selfName}
                        onChange={e => setShippingInfo({ ...shippingInfo, selfName: e.target.value })}
                      />
                    </div>
                    <div className="pay-form-group">
                      <label>Số điện thoại của bạn *</label>
                      <input
                        type="tel"
                        required
                        inputMode="numeric"
                        maxLength={11}
                        autoComplete="tel"
                        placeholder="VD: 0912345678"
                        value={shippingInfo.selfPhone}
                        onChange={e => setShippingInfo({ ...shippingInfo, selfPhone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

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
                    <small>{isGuest ? 'Dùng họ tên & SĐT bạn vừa nhập' : 'Sử dụng thông tin tài khoản hiện tại'}</small>
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
              {shippingInfo.recipientMode === 'self' && !isGuest && (
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
                      <span className="pay-item-qty">
                        SL: {item.quantity} x {hasDeal(item.price, item.original_price) && (
                          <s className="pay-item-price-old">{Number(item.original_price).toLocaleString('vi-VN')}₫</s>
                        )}{Number(item.price).toLocaleString('vi-VN')}₫
                      </span>
                      {hasDeal(item.price, item.original_price) && (
                        <span className="pay-item-deal">
                          Khuyến mãi {dealLabel(item.discount_percentage)}
                        </span>
                      )}
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
                          {voucherShortfall > 0
                            ? `Cần mua thêm ${voucherShortfall.toLocaleString('vi-VN')}₫ để dùng mã`
                            : `Đã giảm ${discountAmount.toLocaleString('vi-VN')}₫`}
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
                  <div className={`voucher-active-banner ${voucherShortfall > 0 ? 'is-ineligible' : ''}`}>
                    {voucherShortfall > 0 ? (
                      <span>
                        ⚠ Mã <strong>{selectedVoucher.code}</strong> chưa áp dụng được: cần mua thêm {voucherShortfall.toLocaleString('vi-VN')}₫
                      </span>
                    ) : (
                      <span>✓ Áp dụng mã <strong>{selectedVoucher.code}</strong> (-{discountAmount.toLocaleString('vi-VN')}₫)</span>
                    )}
                    <button
                      type="button"
                      onClick={clearSelectedVoucher}
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

                {productSavings > 0 && (
                  <div className="cost-line product-savings-line">
                    <span>Đã giảm nhờ khuyến mãi:</span>
                    <span>{productSavings.toLocaleString('vi-VN')}₫</span>
                  </div>
                )}
                
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

              {/* Ví voucher: mã dùng 1 lần khách đã nhập & lưu vào tài khoản (chưa dùng) */}
              {!isGuest && savedVouchers.length > 0 && (
                <div className="voucher-cards-list saved-voucher-list">
                  <p className="saved-voucher-title">Mã đã lưu của bạn</p>
                  {savedVouchers.map(v => {
                    const isEligible = total >= v.minOrder;
                    // Mã đang chọn nhưng giỏ đã tụt dưới mức tối thiểu thì không hiện "Đang dùng"
                    const isCurrent = selectedVoucher?.code === v.code && total >= v.minOrder;
                    return (
                      <div
                        key={v.code}
                        className={`voucher-item-card ${isCurrent ? 'active' : ''} ${!isEligible ? 'ineligible' : ''}`}
                        onClick={() => isEligible && !isCurrent && handleSelectVoucher(v)}
                      >
                        <div className="voucher-item-left">
                          <div className="voucher-code-badge">{v.code}</div>
                          <div className="voucher-item-texts">
                            <h4 className="voucher-item-name">{v.name}</h4>
                            <p className="voucher-item-desc">{v.desc}</p>
                            {isEligible ? (
                              <span className="voucher-eligibility eligible">
                                ✓ Tiết kiệm được: <strong>{v.calculateDiscount(total).toLocaleString('vi-VN')}₫</strong>
                              </span>
                            ) : (
                              <span className="voucher-eligibility not-enough">
                                Cần mua thêm {(v.minOrder - total).toLocaleString('vi-VN')}₫ để áp dụng
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="voucher-item-right saved-voucher-actions">
                          {isCurrent ? (
                            <span className="voucher-applied-pill">✓ Đang dùng</span>
                          ) : isEligible ? (
                            <button
                              type="button"
                              className="voucher-select-btn"
                              onClick={(e) => { e.stopPropagation(); handleSelectVoucher(v); }}
                            >
                              Áp dụng
                            </button>
                          ) : (
                            <button type="button" disabled className="voucher-disabled-btn">Chưa đủ ĐK</button>
                          )}
                          <button
                            type="button"
                            className="saved-voucher-remove-btn"
                            title="Xóa khỏi danh sách đã lưu"
                            onClick={(e) => { e.stopPropagation(); handleRemoveSaved(v); }}
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Danh sách các voucher */}
              <div className="voucher-cards-list">
                {vouchers.length === 0 && (
                  <p className="modal-sub" style={{ textAlign: 'center', padding: '16px 0' }}>Hiện chưa có voucher nào dành cho bạn.</p>
                )}
                {vouchers.map(v => {
                  const isEligible = total >= v.minOrder;
                  const isCurrent = selectedVoucher?.code === v.code && total >= v.minOrder;
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
                    placeholder="Nhập mã voucher hoặc mã quà tặng 8 ký tự"
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
                      clearSelectedVoucher();
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

              {orderSuccessModal.guest_phone && (
                <p className="order-success-guest-note">
                  Hãy lưu lại mã đơn <strong>#{orderSuccessModal.order_code}</strong>. Tiệm sẽ gọi số{' '}
                  <strong>{orderSuccessModal.guest_phone}</strong> khi cần xác nhận. Đăng ký tài khoản bằng số này để
                  xem lại đơn và nhận thông báo khi bánh sẵn sàng.
                </p>
              )}

              <button
                type="button"
                className="order-success-btn-invoice"
                onClick={handleDownloadInvoice}
                disabled={downloadingInvoice}
              >
                <ion-icon name="download-outline"></ion-icon>
                <span>{downloadingInvoice ? 'Đang tạo hóa đơn...' : 'Tải hóa đơn (PDF)'}</span>
              </button>

              <div className="order-success-actions">
                <button
                  type="button"
                  className="order-success-btn-home"
                  onClick={() => navigate('/')}
                >
                  <ion-icon name="arrow-back-outline"></ion-icon>
                  <span>Quay về trang chủ</span>
                </button>
                {orderSuccessModal.guest_phone ? (
                  // Khách vãng lai chưa có tài khoản để xem hóa đơn: đăng ký bằng đúng SĐT này sẽ thấy lại đơn
                  <button
                    type="button"
                    className="order-success-btn-receipt"
                    onClick={() => navigate('/register')}
                  >
                    <ion-icon name="person-add-outline"></ion-icon>
                    <span>Đăng ký để theo dõi đơn</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="order-success-btn-receipt"
                    onClick={() => navigate('/receipt')}
                  >
                    <ion-icon name="receipt-outline"></ion-icon>
                    <span>Qua xem hóa đơn</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import { Link } from 'react-router-dom';
import { clientOrdersApi } from '../../api/client';
import {
  formatVND, formatDate, formatDateTime, apiErrorMessage, imageUrl,
  ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS,
} from '../../utils/format';
import popup from '../../utils/popup';
import './Receipt.css';

const STATUS_CLASS = { Completed: 'success', Ready: 'success', Pending: 'warning', Processing: 'warning' };

export default function Receipt() {
  const user = useAuthStore(state => state.user);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [detailOrder, setDetailOrder] = useState(null);

  useEffect(() => {
    if (!user) return;
    clientOrdersApi.getMyOrders()
      .then((res) => setOrders(res.data))
      .catch((err) => setLoadError(apiErrorMessage(err, 'Không tải được lịch sử đơn hàng.')))
      .finally(() => setLoading(false));
  }, [user]);

  // Đóng modal khi nhấn phím Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setDetailOrder(null);
    };
    if (detailOrder) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailOrder]);

  const showDetail = (o) => {
    setDetailOrder(o);
  };

  if (!user) {
    return (
      <div className="receipt-page-wrapper">
        <div className="receipt-not-login">
          <ion-icon name="receipt-outline" style={{ fontSize: '48px', color: '#d4845a' }}></ion-icon>
          <h2>Lịch sử hóa đơn đơn hàng</h2>
          <p>Vui lòng đăng nhập để xem lại các hóa đơn và trạng thái đơn hàng của bạn.</p>
          <Link to="/login" className="receipt-login-btn">Đăng nhập tài khoản</Link>
        </div>
      </div>
    );
  }

  const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.phone || "Khách hàng";

  return (
    <div className="receipt-page-wrapper">
      <div className="receipt-container">

        <h1 className="receipt-title">Hóa đơn của bạn ({displayName})</h1>

        <div className="receipt-table-wrap">
          <table className="receipt-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Ngày đặt</th>
                <th>Món đã đặt</th>
                <th style={{ textAlign: 'center' }}>Số lượng tổng</th>
                <th>Tổng thanh toán</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading || loadError || orders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                    {loading ? 'Đang tải...' : loadError || 'Bạn chưa có đơn hàng nào.'}
                  </td>
                </tr>
              ) : orders.map(o => {
                const totalQty = o.total_quantity || o.details.reduce((sum, d) => sum + d.quantity, 0);
                return (
                  <tr key={o.order_id}>
                    <td style={{ fontWeight: '700', color: '#d4845a' }}>#{o.order_code}</td>
                    <td style={{ fontSize: '13px', color: '#64748b' }}>{formatDate(o.order_date)}</td>
                    <td>
                      <div className="receipt-product-list">
                        {o.details.slice(0, 3).map((d, idx) => (
                          <div key={idx} className="receipt-product-item">
                            {d.product_name}
                          </div>
                        ))}
                        {o.details.length > 3 && (
                          <div className="receipt-product-item-more">...</div>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '700', color: '#1e293b' }}>
                      {totalQty}
                    </td>
                    <td style={{ fontWeight: '700', color: '#1e293b' }}>{formatVND(o.final_cost)}</td>
                    <td>
                      <span className={`receipt-badge ${STATUS_CLASS[o.status] || ''}`}>
                        {ORDER_STATUS[o.status]?.label || o.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        id={`receipt-detail-btn-${o.order_id}`}
                        onClick={() => showDetail(o)}
                        className="receipt-detail-btn"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* POPUP MODAL CHI TIẾT SẢN PHẨM & ĐƠN HÀNG */}
        {detailOrder && (
          <div id="receipt-modal-backdrop" className="receipt-modal-backdrop" onClick={() => setDetailOrder(null)}>
            <div id="receipt-modal-window" className="receipt-modal-window" onClick={e => e.stopPropagation()}>
              
              {/* 1. PHẦN ĐẦU: TIÊU ĐỀ, THÔNG TIN KHÁCH, NGÀY ĐẶT & THANH TOÁN */}
              <div className="receipt-modal-header">
                <div className="receipt-modal-header-left">
                  <div className="receipt-modal-badge-row">
                    <span className="receipt-modal-code">#{detailOrder.order_code}</span>
                    <span className={`receipt-badge ${STATUS_CLASS[detailOrder.status] || ''}`}>
                      {ORDER_STATUS[detailOrder.status]?.label || detailOrder.status}
                    </span>
                  </div>
                  <h2 className="receipt-modal-title">Chi Tiết Hóa Đơn</h2>
                </div>
                <button
                  id="receipt-modal-btn-close-header"
                  type="button"
                  className="receipt-modal-close-btn"
                  onClick={() => setDetailOrder(null)}
                  title="Đóng popup"
                >
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>

              {/* KHỐI THÔNG TIN KHÁCH HÀNG & ĐƠN HÀNG */}
              <div className="receipt-modal-info-grid">
                <div className="receipt-info-item">
                  <span className="receipt-info-label">Khách hàng nhận bánh:</span>
                  <span className="receipt-info-val">
                    <strong>{detailOrder.recipient_name}</strong> ({detailOrder.recipient_phone})
                  </span>
                </div>
                <div className="receipt-info-item">
                  <span className="receipt-info-label">Ngày đặt hàng:</span>
                  <span className="receipt-info-val">{formatDateTime(detailOrder.order_date)}</span>
                </div>
                <div className="receipt-info-item">
                  <span className="receipt-info-label">Hình thức thanh toán:</span>
                  <span className="receipt-info-val">
                    {PAYMENT_METHOD[detailOrder.payment_method] || detailOrder.payment_method}
                    <span className={`payment-status-tag ${detailOrder.payment_status?.toLowerCase() || ''}`}>
                      ({PAYMENT_STATUS[detailOrder.payment_status] || detailOrder.payment_status})
                    </span>
                  </span>
                </div>
                <div className="receipt-info-item">
                  <span className="receipt-info-label">Thời gian lấy bánh:</span>
                  <span className="receipt-info-val">
                    {formatDateTime(detailOrder.pickup_time)}
                  </span>
                </div>
                {detailOrder.notes && (
                  <div className="receipt-info-item full-width">
                    <span className="receipt-info-label">Ghi chú từ khách:</span>
                    <span className="receipt-info-val notes-val">{detailOrder.notes}</span>
                  </div>
                )}
              </div>

              {/* 2. PHẦN THÂN (BODY): BẢNG DANH SÁCH SẢN PHẨM */}
              <div className="receipt-modal-body">
                <div className="receipt-modal-table-wrap">
                  <table className="receipt-detail-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                        <th>Sản phẩm</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>Số lượng</th>
                        <th style={{ width: '120px', textAlign: 'right' }}>Giá 1 sản phẩm</th>
                        <th style={{ width: '130px', textAlign: 'right' }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailOrder.details.map((d, index) => (
                        <tr key={index}>
                          <td style={{ textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                            {index + 1}
                          </td>
                          <td>
                            <div className="receipt-product-cell">
                              {d.image && (
                                <img
                                  src={imageUrl(d.image)}
                                  alt={d.product_name}
                                  className="receipt-product-thumb"
                                  onError={e => { e.target.src = '/assets/Img/Sweets1.png'; }}
                                />
                              )}
                              <div>
                                <div className="receipt-product-name">{d.product_name}</div>
                                <span className="receipt-product-size">{d.size_name}</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '700', fontSize: '15px' }}>
                            {d.quantity}
                          </td>
                          <td style={{ textAlign: 'right', color: '#475569' }}>
                            {formatVND(d.price)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                            {formatVND(d.total_price || d.price * d.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. PHẦN BÊN DƯỚI CUỐI (FOOTER): SỐ LƯỢNG TỔNG & GIÁ TỔNG SẢN PHẨM */}
              <div className="receipt-modal-footer">
                <div className="receipt-footer-summary-box">
                  <div className="receipt-summary-line">
                    <span className="summary-label">Số lượng tổng:</span>
                    <span className="summary-val total-qty">
                      <strong>
                        {detailOrder.total_quantity || detailOrder.details.reduce((sum, d) => sum + d.quantity, 0)}
                      </strong> món
                    </span>
                  </div>

                  {Number(detailOrder.discount_amount) > 0 && (
                    <div className="receipt-summary-line discount-line">
                      <span className="summary-label">Giảm giá voucher:</span>
                      <span className="summary-val discount-val">-{formatVND(detailOrder.discount_amount)}</span>
                    </div>
                  )}

                  <div className="receipt-summary-line total-line">
                    <span className="summary-label">Giá tổng sản phẩm:</span>
                    <span className="summary-val total-cost">{formatVND(detailOrder.final_cost)}</span>
                  </div>
                </div>

                <div className="receipt-modal-footer-actions">
                  <button
                    id="receipt-modal-btn-close-footer"
                    type="button"
                    className="receipt-modal-btn-close"
                    onClick={() => setDetailOrder(null)}
                  >
                    Đóng
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}


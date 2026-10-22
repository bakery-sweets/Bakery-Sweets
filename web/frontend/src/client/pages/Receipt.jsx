import React, { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import { Link } from 'react-router-dom';
import { clientOrdersApi } from '../../api/client';
import {
  formatVND, formatDate, formatDateTime, apiErrorMessage, imageUrl,
  ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS,
} from '../../utils/format';
import './Receipt.css';

const STATUS_CLASS = { Completed: 'success', Ready: 'success', Pending: 'warning', Processing: 'warning' };

export default function Receipt() {
  const user = useAuthStore(state => state.user);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  useEffect(() => {
    if (!user) return;
    clientOrdersApi.getMyOrders()
      .then((res) => {
        const list = res.data || [];
        setOrders(list);
        if (list.length > 0) {
          setSelectedOrderId(list[0].order_id);
        }
      })
      .catch((err) => setLoadError(apiErrorMessage(err, 'Không tải được lịch sử đơn hàng.')))
      .finally(() => setLoading(false));
  }, [user]);

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
  const selectedOrder = orders.find(o => o.order_id === selectedOrderId) || (orders.length > 0 ? orders[0] : null);

  return (
    <div className="receipt-page-wrapper">
      <div className="receipt-container">

        {/* TIÊU ĐỀ TRANG */}
        <div className="receipt-header-row">
          <div>
            <h1 className="receipt-title">Lịch sử hóa đơn</h1>
            <p className="receipt-subtitle">Xin chào <strong>{displayName}</strong>, danh sách hóa đơn mua sắm và chi tiết các đơn đặt hàng của bạn.</p>
          </div>
          {orders.length > 0 && (
            <div className="receipt-total-count-badge">
              <ion-icon name="documents-outline"></ion-icon>
              <span>{orders.length} hóa đơn</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="receipt-loading-box">
            <div className="receipt-spinner"></div>
            <p>Đang tải danh sách hóa đơn...</p>
          </div>
        ) : loadError ? (
          <div className="receipt-error-box">
            <ion-icon name="alert-circle-outline"></ion-icon>
            <p>{loadError}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="receipt-empty-box">
            <ion-icon name="receipt-outline"></ion-icon>
            <h3>Bạn chưa có hóa đơn nào</h3>
            <p>Hãy dạo quanh tiệm bánh và chọn cho mình những món tráng miệng thơm ngon nhé!</p>
            <Link to="/" className="receipt-shop-btn">Khám phá thực đơn</Link>
          </div>
        ) : (
          /* BỐ CỤC CHIA ĐÔI: BÊN TRÁI LÀ LIST HÓA ĐƠN, BÊN PHẢI LÀ CHI TIẾT ĐƠN ĐÓ */
          <div className="receipt-split-layout">

            {/* =========================================================================
                1. CỘT BÊN TRÁI: DANH SÁCH THẺ HÓA ĐƠN
                ========================================================================= */}
            <div className="receipt-master-column">
              <div className="receipt-column-header">
                <ion-icon name="list-outline"></ion-icon>
                <span>Tất cả hóa đơn</span>
              </div>

              <div className="receipt-order-cards-list">
                {orders.map((o) => {
                  const isSelected = selectedOrder && selectedOrder.order_id === o.order_id;
                  const totalQty = o.total_quantity || o.details.reduce((sum, d) => sum + d.quantity, 0);

                  return (
                    <div
                      key={o.order_id}
                      id={`order-card-${o.order_id}`}
                      className={`receipt-order-card ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedOrderId(o.order_id)}
                      tabIndex={0}
                      role="button"
                    >
                      {/* Dòng 1: Mã đơn & Trạng thái */}
                      <div className="order-card-header">
                        <span className="order-card-code">#{o.order_code}</span>
                        <span className={`receipt-badge ${STATUS_CLASS[o.status] || ''}`}>
                          {ORDER_STATUS[o.status]?.label || o.status}
                        </span>
                      </div>

                      {/* Dòng 2: Ngày giờ đặt */}
                      <div className="order-card-date">
                        <ion-icon name="calendar-outline"></ion-icon>
                        <span>{formatDateTime(o.order_date)}</span>
                      </div>

                      {/* Dòng 3: Danh sách sản phẩm - Số lượng hiện ngay dưới tên màu xám nhạt */}
                      <div className="order-card-products">
                        {o.details.slice(0, 3).map((d, idx) => (
                          <div key={idx} className="order-card-product-item">
                            <span className="order-card-product-name">{d.product_name}</span>
                            <span className="order-card-product-qty">
                              Số lượng: {d.quantity} {d.size_name ? `• ${d.size_name}` : ''}
                            </span>
                          </div>
                        ))}
                        {o.details.length > 3 && (
                          <div className="order-card-products-more">
                            ... và {o.details.length - 3} món khác
                          </div>
                        )}
                      </div>

                      {/* Dòng 4: Tổng số lượng & Giá thanh toán */}
                      <div className="order-card-footer">
                        <div className="order-card-total-qty">
                          <ion-icon name="bag-handle-outline"></ion-icon>
                          <span>{totalQty} món</span>
                        </div>
                        <div className="order-card-final-cost">
                          {formatVND(o.final_cost)}
                        </div>
                      </div>

                      {/* Dấu viền chỉ định card đang chọn */}
                      {isSelected && <div className="order-card-active-indicator"></div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* =========================================================================
                2. CỘT BÊN PHẢI: CHI TIẾT HÓA ĐƠN TRỰC TIẾP (KHÔNG DÙNG POPUP)
                ========================================================================= */}
            <div className="receipt-detail-column">
              {selectedOrder ? (
                <div className="receipt-detail-card" id="receipt-detail-panel">
                  
                  {/* TIÊU ĐỀ CHI TIẾT & TRẠNG THÁI */}
                  <div className="receipt-detail-head">
                    <div>
                      <div className="receipt-detail-badge-row">
                        <span className="receipt-detail-code">#{selectedOrder.order_code}</span>
                        <span className={`receipt-badge ${STATUS_CLASS[selectedOrder.status] || ''}`}>
                          {ORDER_STATUS[selectedOrder.status]?.label || selectedOrder.status}
                        </span>
                      </div>
                      <h2 className="receipt-detail-title">Chi Tiết Hóa Đơn</h2>
                    </div>
                  </div>

                  {/* THÔNG TIN KHÁCH HÀNG & ĐƠN HÀNG */}
                  <div className="receipt-detail-info-grid">
                    <div className="receipt-detail-info-item">
                      <span className="info-label">Khách hàng nhận bánh</span>
                      <span className="info-val">
                        <strong>{selectedOrder.recipient_name}</strong> ({selectedOrder.recipient_phone})
                      </span>
                    </div>

                    <div className="receipt-detail-info-item">
                      <span className="info-label">Ngày đặt hàng</span>
                      <span className="info-val">{formatDateTime(selectedOrder.order_date)}</span>
                    </div>

                    <div className="receipt-detail-info-item">
                      <span className="info-label">Hình thức thanh toán</span>
                      <span className="info-val">
                        {PAYMENT_METHOD[selectedOrder.payment_method] || selectedOrder.payment_method}
                        <span className={`payment-status-tag ${selectedOrder.payment_status?.toLowerCase() || ''}`}>
                          ({PAYMENT_STATUS[selectedOrder.payment_status] || selectedOrder.payment_status})
                        </span>
                      </span>
                    </div>

                    <div className="receipt-detail-info-item">
                      <span className="info-label">Thời gian lấy bánh</span>
                      <span className="info-val">{formatDateTime(selectedOrder.pickup_time)}</span>
                    </div>

                    {selectedOrder.notes && (
                      <div className="receipt-detail-info-item full-width">
                        <span className="info-label">Ghi chú từ khách</span>
                        <span className="info-notes">{selectedOrder.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* PHẦN THÂN: BẢNG SẢN PHẨM CHI TIẾT */}
                  <div className="receipt-detail-body">
                    <h3 className="receipt-section-subtitle">
                      <ion-icon name="fast-food-outline"></ion-icon>
                      Danh sách sản phẩm ({selectedOrder.details.length} món)
                    </h3>

                    <div className="receipt-detail-table-wrap">
                      <table className="receipt-detail-table">
                        <thead>
                          <tr>
                            <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                            <th>Sản phẩm</th>
                            <th style={{ width: '85px', textAlign: 'center' }}>Số lượng</th>
                            <th style={{ width: '115px', textAlign: 'right' }}>Giá 1 bánh</th>
                            <th style={{ width: '125px', textAlign: 'right' }}>Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.details.map((d, index) => (
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
                                    <div className="receipt-product-sub-info">
                                      <span className="receipt-product-subqty">Số lượng: {d.quantity}</span>
                                      {d.size_name && (
                                        <span className="receipt-product-size">{d.size_name}</span>
                                      )}
                                    </div>
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

                  {/* PHẦN DƯỚI: TỔNG KẾT HÓA ĐƠN */}
                  <div className="receipt-detail-footer">
                    <div className="receipt-footer-summary-box">
                      <div className="receipt-summary-line">
                        <span className="summary-label">Số lượng tổng:</span>
                        <span className="summary-val total-qty">
                          <strong>
                            {selectedOrder.total_quantity || selectedOrder.details.reduce((sum, d) => sum + d.quantity, 0)}
                          </strong> món
                        </span>
                      </div>

                      {Number(selectedOrder.discount_amount) > 0 && (
                        <div className="receipt-summary-line discount-line">
                          <span className="summary-label">Giảm giá voucher:</span>
                          <span className="summary-val discount-val">-{formatVND(selectedOrder.discount_amount)}</span>
                        </div>
                      )}

                      <div className="receipt-summary-line total-line">
                        <span className="summary-label">Giá tổng sản phẩm:</span>
                        <span className="summary-val total-cost">{formatVND(selectedOrder.final_cost)}</span>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="receipt-detail-empty">
                  <ion-icon name="document-text-outline"></ion-icon>
                  <p>Vui lòng chọn một hóa đơn bên trái để xem chi tiết.</p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

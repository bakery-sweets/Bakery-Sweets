import React, { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import { Link } from 'react-router-dom';
import { clientOrdersApi } from '../../api/client';
import {
  formatVND, formatDate, formatDateTime, apiErrorMessage,
  ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS,
} from '../../utils/format';
import './Receipt.css';

const STATUS_CLASS = { Completed: 'success', Ready: 'success', Pending: 'warning', Processing: 'warning' };

export default function Receipt() {
  const user = useAuthStore(state => state.user);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!user) return;
    clientOrdersApi.getMyOrders()
      .then((res) => setOrders(res.data))
      .catch((err) => setLoadError(apiErrorMessage(err, 'Không tải được lịch sử đơn hàng.')))
      .finally(() => setLoading(false));
  }, [user]);

  const showDetail = (o) => {
    alert(
      `Chi tiết hóa đơn #${o.order_code}\n\n` +
      o.details.map(d => `• ${d.quantity}x ${d.product_name} (${d.size_name}) - ${formatVND(d.total_price)}`).join('\n') +
      `\n\nNgười nhận: ${o.recipient_name} (${o.recipient_phone})` +
      `\nGiờ lấy bánh: ${formatDateTime(o.pickup_time)}` +
      `\nThanh toán: ${PAYMENT_METHOD[o.payment_method] || o.payment_method} - ${PAYMENT_STATUS[o.payment_status] || o.payment_status}` +
      (Number(o.discount_amount) > 0 ? `\nGiảm giá: -${formatVND(o.discount_amount)}` : '') +
      `\nTổng thanh toán: ${formatVND(o.final_cost)}` +
      (o.notes ? `\nGhi chú: ${o.notes}` : '')
    );
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
                <th>Tổng thanh toán</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading || loadError || orders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                    {loading ? 'Đang tải...' : loadError || 'Bạn chưa có đơn hàng nào.'}
                  </td>
                </tr>
              ) : orders.map(o => (
                <tr key={o.order_id}>
                  <td style={{ fontWeight: '700', color: '#d4845a' }}>{o.order_code}</td>
                  <td style={{ fontSize: '13px', color: '#64748b' }}>{formatDate(o.order_date)}</td>
                  <td style={{ fontWeight: '500' }}>
                    {o.details.map(d => `${d.quantity}x ${d.product_name} (${d.size_name})`).join(', ')}
                  </td>
                  <td style={{ fontWeight: '700', color: '#1e293b' }}>{formatVND(o.final_cost)}</td>
                  <td>
                    <span className={`receipt-badge ${STATUS_CLASS[o.status] || ''}`}>
                      {ORDER_STATUS[o.status]?.label || o.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => showDetail(o)}
                      className="receipt-detail-btn"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

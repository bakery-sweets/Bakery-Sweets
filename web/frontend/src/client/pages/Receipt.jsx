import React, { useState } from 'react';
import useAuthStore from '../store/authStore';
import { Link } from 'react-router-dom';
import './Receipt.css';

export default function Receipt() {
  const user = useAuthStore(state => state.user);

  const [orders] = useState([
    { id: "DH1024", date: "19/09/2026", items: "2x Chocolate Mousse (Size M), 1x Peach Tea", total: "$28.50", status: "Hoàn thành", statusClass: "success" },
    { id: "DH1012", date: "12/09/2026", items: "1x Butter Croissant, 1x Matcha Cake", total: "$19.50", status: "Đang giao", statusClass: "warning" },
  ]);

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

  return (
    <div className="receipt-page-wrapper">
      <div className="receipt-container">
        
        <h1 className="receipt-title">Hóa đơn của bạn ({user.username || user.userName || "Khách hàng"})</h1>
        
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
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: '700', color: '#d4845a' }}>{o.id}</td>
                  <td style={{ fontSize: '13px', color: '#64748b' }}>{o.date}</td>
                  <td style={{ fontWeight: '500' }}>{o.items}</td>
                  <td style={{ fontWeight: '700', color: '#1e293b' }}>{o.total}</td>
                  <td>
                    <span className={`receipt-badge ${o.statusClass}`}>{o.status}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      onClick={() => alert(`Chi tiết hóa đơn #${o.id}`)}
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

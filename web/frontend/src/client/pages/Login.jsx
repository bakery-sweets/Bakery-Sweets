import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useCartStore from '../../store/cartStore';
import { clientAuthApi } from '../../api/client';
import { apiErrorMessage } from '../../utils/format';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await clientAuthApi.login({ phone: phone.trim(), password });
      setUser({ phone: res.phone, email: res.email, role: res.role }, res.access_token);
      const me = await clientAuthApi.getProfile();
      setUser(me.data, res.access_token);
      await useCartStore.getState().syncAfterLogin();
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err, 'Đăng nhập thất bại, vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 30px 10px 0',
    border: 'none',
    borderBottom: '1.5px solid #1a2639',
    outline: 'none',
    fontSize: '16px',
    backgroundColor: 'transparent',
    color: '#333'
  };

  const iconStyle = {
    position: 'absolute',
    right: '0',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#666',
    pointerEvents: 'none'
  };

  const inputContainerStyle = {
    position: 'relative',
    width: '100%',
    marginBottom: '40px'
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 16px', backgroundColor: '#fff', minHeight: '70vh' }}>
      <div style={{ width: '100%', maxWidth: '500px' }}>
        <h1 style={{ textAlign: 'center', color: '#1a2639', marginBottom: '35px', fontSize: '36px', fontWeight: 'bold' }}>Đăng nhập</h1>
        
        <form onSubmit={handleLogin}>
          {error && (
            <p style={{ color: '#b91c1c', background: '#fee2e2', padding: '10px 14px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>{error}</p>
          )}

          <div style={inputContainerStyle}>
            <input type="tel" placeholder="Số điện thoại" value={phone} onChange={e => setPhone(e.target.value)} required style={inputStyle} />
            <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          </div>

          <div style={inputContainerStyle}>
            <input type="password" placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="remember" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              <label htmlFor="remember" style={{ color: '#333', cursor: 'pointer', fontSize: '15px' }}>Ghi nhớ đăng nhập</label>
            </div>
            <Link to="#" style={{ color: '#333', textDecoration: 'none', fontSize: '15px' }}>Quên mật khẩu?</Link>
          </div>

          <button type="submit" disabled={submitting} style={{ 
            width: '100%', 
            padding: '15px', 
            backgroundColor: '#1a2639', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '10px', 
            fontSize: '18px', 
            fontWeight: '600', 
            cursor: submitting ? 'wait' : 'pointer',
            marginBottom: '20px'
          }}>
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <div style={{ textAlign: 'center', fontSize: '15px', color: '#333' }}>
            Chưa có tài khoản? <Link to="/register" style={{ color: '#1a2639', fontWeight: 'bold', textDecoration: 'none' }}>Đăng ký</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

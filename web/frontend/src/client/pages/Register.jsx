import './Auth.css';
import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clientAuthApi } from '../../api/client';
import { apiErrorMessage } from '../../utils/format';
import popup from '../../utils/popup';

export default function Register() {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const agreeRef = useRef(null);

  const navigate = useNavigate();

  // Nhấn Enter chuyển focus sang ô tiếp theo theo chiều ngang (SĐT -> Email -> Họ -> Tên -> Mật khẩu -> Xác nhận mật khẩu)
  const handleKeyDown = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      }
    }
  };

  const handleConfirmKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!agree) {
        if (agreeRef.current) {
          agreeRef.current.focus();
        }
      } else {
        handleRegister(e);
      }
    }
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    if (password !== confirmPassword) {
      popup.warning("Mật khẩu xác nhận không khớp!", { title: "Xác nhận mật khẩu" });
      return;
    }
    if (!agree) {
      popup.warning("Vui lòng đồng ý với các điều khoản và điều kiện.", { title: "Điều khoản dịch vụ" });
      return;
    }
    setSubmitting(true);
    try {
      await clientAuthApi.register({
        phone: phone.trim(),
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      popup.success("Đăng ký tài khoản thành công! Vui lòng đăng nhập.");
      navigate('/login');
    } catch (err) {
      popup.error(apiErrorMessage(err, "Đăng ký thất bại, vui lòng thử lại."));
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
    marginBottom: '30px'
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px', backgroundColor: '#fff', minHeight: '80vh' }}>
      <div style={{ width: '100%', maxWidth: '800px' }}>
        <h1 style={{ textAlign: 'center', color: '#1a2639', marginBottom: '50px', fontSize: '36px', fontWeight: 'bold' }}>Đăng ký tài khoản</h1>
        
        <form onSubmit={handleRegister}>
          <div className="register-grid">
            
            {/* 1. Phone (Hàng 1 - Cột 1) */}
            <div style={inputContainerStyle}>
              <input 
                ref={phoneRef}
                type="tel" 
                placeholder="Số điện thoại*" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                onKeyDown={e => handleKeyDown(e, emailRef)}
                required 
                style={inputStyle} 
              />
              <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            </div>

            {/* 2. Email (Hàng 1 - Cột 2) */}
            <div style={inputContainerStyle}>
              <input 
                ref={emailRef}
                type="email" 
                placeholder="Email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                onKeyDown={e => handleKeyDown(e, firstNameRef)}
                required 
                style={inputStyle} 
              />
              <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </div>

            {/* 3. First Name (Hàng 2 - Cột 1) */}
            <div style={inputContainerStyle}>
              <input 
                ref={firstNameRef}
                type="text" 
                placeholder="Họ" 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)} 
                onKeyDown={e => handleKeyDown(e, lastNameRef)}
                required 
                style={inputStyle} 
              />
              <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>

            {/* 4. Last Name (Hàng 2 - Cột 2) */}
            <div style={inputContainerStyle}>
              <input 
                ref={lastNameRef}
                type="text" 
                placeholder="Tên" 
                value={lastName} 
                onChange={e => setLastName(e.target.value)} 
                onKeyDown={e => handleKeyDown(e, passwordRef)}
                required 
                style={inputStyle} 
              />
              <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>

            {/* 5. Password (Hàng 3 - Cột 1) */}
            <div style={inputContainerStyle}>
              <input 
                ref={passwordRef}
                type="password" 
                placeholder="Mật khẩu" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                onKeyDown={e => handleKeyDown(e, confirmPasswordRef)}
                required 
                style={inputStyle} 
              />
              <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>

            {/* 6. Confirm Password (Hàng 3 - Cột 2) */}
            <div style={inputContainerStyle}>
              <input 
                ref={confirmPasswordRef}
                type="password" 
                placeholder="Xác nhận mật khẩu" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                onKeyDown={handleConfirmKeyDown}
                required 
                style={inputStyle} 
              />
              <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>

          </div>

          <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              ref={agreeRef}
              type="checkbox" 
              id="agree" 
              checked={agree} 
              onChange={e => setAgree(e.target.checked)} 
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setAgree(!agree);
                }
              }}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
            />
            <label htmlFor="agree" style={{ color: '#333', cursor: 'pointer', fontSize: '15px' }}>Tôi đồng ý với các điều khoản &amp; điều kiện</label>
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
            cursor: 'pointer',
            marginBottom: '20px'
          }}>
            Đăng ký
          </button>

          <div style={{ textAlign: 'center', fontSize: '15px', color: '#333' }}>
            Đã có tài khoản? <Link to="/login" style={{ color: '#1a2639', fontWeight: 'bold', textDecoration: 'none' }}>Đăng nhập</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

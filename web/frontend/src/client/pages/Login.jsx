import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const handleLogin = async (e) => {
    e.preventDefault();
    // Mock login
    console.log("Logging in:", { userName, password });
    setUser({ userName, name: userName }, 'mock_token_123');
    navigate('/');
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
        <h1 style={{ textAlign: 'center', color: '#1a2639', marginBottom: '35px', fontSize: '36px', fontWeight: 'bold' }}>Login</h1>
        
        <form onSubmit={handleLogin}>
          
          <div style={inputContainerStyle}>
            <input type="text" placeholder="User name" value={userName} onChange={e => setUserName(e.target.value)} required style={inputStyle} />
            <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>

          <div style={inputContainerStyle}>
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="remember" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              <label htmlFor="remember" style={{ color: '#333', cursor: 'pointer', fontSize: '15px' }}>remember me</label>
            </div>
            <Link to="#" style={{ color: '#333', textDecoration: 'none', fontSize: '15px' }}>Forgot Password</Link>
          </div>

          <button type="submit" style={{ 
            width: '100%', 
            padding: '15px', 
            backgroundColor: '#1a2639', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '6px', 
            fontSize: '18px', 
            fontWeight: '600', 
            cursor: 'pointer',
            marginBottom: '20px'
          }}>
            Login
          </button>

          <div style={{ textAlign: 'center', fontSize: '15px', color: '#333' }}>
            Don't have an account ? <Link to="/register" style={{ color: '#1a2639', fontWeight: 'bold', textDecoration: 'none' }}>Register</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

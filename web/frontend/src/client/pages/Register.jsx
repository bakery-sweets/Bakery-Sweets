import './Auth.css';
﻿import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [agree, setAgree] = useState(false);
  
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (!agree) {
      alert("Please agree to the terms and conditions.");
      return;
    }
    // Mock register
    console.log("Registering:", { userName, email, password, firstName, lastName, phone, gender });
    alert("Registered successfully! Please login.");
    navigate('/login');
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
        <h1 style={{ textAlign: 'center', color: '#1a2639', marginBottom: '50px', fontSize: '36px', fontWeight: 'bold' }}>Registration</h1>
        
        <form onSubmit={handleRegister}>
          <div className="register-grid">
            
            {/* Left Column */}
            <div>
              <div style={inputContainerStyle}>
                <input type="text" placeholder="User name*" value={userName} onChange={e => setUserName(e.target.value)} required style={inputStyle} />
                <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>

              <div style={inputContainerStyle}>
                <input type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required style={inputStyle} />
                <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>

              <div style={inputContainerStyle}>
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
                <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </div>

              <div style={inputContainerStyle}>
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
                <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <div style={inputContainerStyle}>
                <input type="tel" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} required style={inputStyle} />
                <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </div>

              <div style={inputContainerStyle}>
                <input type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} required style={inputStyle} />
                <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              
              <div style={inputContainerStyle}>
                <select value={gender} onChange={e => setGender(e.target.value)} required style={{...inputStyle, appearance: 'none'}}>
                  <option value="" disabled>Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </div>

              <div style={inputContainerStyle}>
                <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={inputStyle} />
                <svg style={iconStyle} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="checkbox" id="agree" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
            <label htmlFor="agree" style={{ color: '#333', cursor: 'pointer', fontSize: '15px' }}>I agree to the terms & conditions</label>
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
            Register
          </button>

          <div style={{ textAlign: 'center', fontSize: '15px', color: '#333' }}>
            Already have an account? <Link to="/login" style={{ color: '#1a2639', fontWeight: 'bold', textDecoration: 'none' }}>Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

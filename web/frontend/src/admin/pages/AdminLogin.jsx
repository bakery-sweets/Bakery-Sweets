import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAdminAuthStore from "../../store/adminAuthStore";
import { adminAuthApi } from "../../api/admin";
import { apiErrorMessage } from "../../utils/format";
import "./AdminLogin.css";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { setUser } = useAdminAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ số điện thoại/email và mật khẩu!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminAuthApi.login({ username: username.trim(), password });
      setUser({ phone: res.phone, email: res.email, role: res.role }, res.access_token);
      navigate("/admin");
    } catch (err) {
      setError(apiErrorMessage(err, "Đăng nhập thất bại"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-box">
        
        <div className="admin-login-header">
          <img src="/assets/Img/Sweets1.png" alt="The Sweets" className="admin-login-logo" />
          <h2>The Sweets Portal</h2>
          <p>Đăng nhập hệ thống quản trị cửa hàng</p>
        </div>

        {error && (
          <div className="admin-login-error">
            <ion-icon name="alert-circle-outline"></ion-icon>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="admin-form-group">
            <label>Số điện thoại / Email</label>
            <div className="admin-input-group">
              <ion-icon name="person-outline"></ion-icon>
              <input
                type="text"
                placeholder="Nhập số điện thoại hoặc email..."
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                required
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label>Mật khẩu</label>
            <div className="admin-input-group">
              <ion-icon name="lock-closed-outline"></ion-icon>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                required
              />
              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <ion-icon name={showPassword ? "eye-off-outline" : "eye-outline"}></ion-icon>
              </button>
            </div>
          </div>

          <div className="admin-login-helper">
            <label className="admin-remember-me">
              <input type="checkbox" defaultChecked />
              <span>Ghi nhớ đăng nhập</span>
            </label>
          </div>

          <button type="submit" className="admin-login-submit" disabled={submitting}>
            <span>{submitting ? "Đang đăng nhập..." : "Đăng Nhập Quản Trị"}</span>
            <ion-icon name="arrow-forward-outline"></ion-icon>
          </button>
        </form>

        <div className="admin-login-footer">
          <Link to="/" className="back-to-store">
            <ion-icon name="arrow-back-outline"></ion-icon>
            <span>Quay lại trang bán hàng</span>
          </Link>
        </div>

      </div>
    </div>
  );
}

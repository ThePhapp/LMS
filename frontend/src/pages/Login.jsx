import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { getRoleHomePath } from '../routing/access';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const authenticatedUser = await login(email, password);
      // Chuyển hướng tới trang được yêu cầu hoặc dashboard
      const from = location.state?.from || getRoleHomePath(authenticatedUser.role);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <header className="auth-header">
          <img src="/vinh.svg" alt="" className="auth-logo" />
          <h1 className="auth-title">Chào mừng trở lại</h1>
          <p className="auth-subtitle">Đăng nhập để tiếp tục học</p>
        </header>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} aria-busy={loading}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input id="login-email" type="email" className="form-input" value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete="email" inputMode="email" aria-invalid={!!error} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Mật khẩu</label>
            <div className="password-field">
              <input id="login-password" type={showPwd ? 'text' : 'password'} className="form-input password-input"
                value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password" aria-invalid={!!error} />
              <button type="button" className="password-toggle" onClick={() => setShowPwd(!showPwd)} aria-label={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                {showPwd ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
            </div>
          </div>
          <button id="login-submit" type="submit" className="btn btn-primary btn-block btn-lg auth-submit" aria-disabled={loading} aria-busy={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <hr className="divider" />
        <p className="auth-footer-copy">
          Chưa có tài khoản?{' '}
          <Link to="/register">Tạo tài khoản</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

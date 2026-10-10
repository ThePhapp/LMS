import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await register(form.name, form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card auth-card-wide">
        <header className="auth-header">
          <img src="/vinh.svg" alt="" className="auth-logo" />
          <h1 className="auth-title">Tạo tài khoản</h1>
          <p className="auth-subtitle">Tham gia Lớp Học Đổi Mới miễn phí ngay hôm nay</p>
        </header>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} aria-busy={loading}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Họ và tên</label>
            <input id="reg-name" type="text" className="form-input" value={form.name}
              onChange={e => set('name', e.target.value)} required autoComplete="name" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" className="form-input" value={form.email}
              onChange={e => set('email', e.target.value)} required autoComplete="email" inputMode="email" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Mật khẩu</label>
            <div className="password-field">
              <input id="reg-password" type={showPwd ? 'text' : 'password'} className="form-input password-input" value={form.password}
                onChange={e => set('password', e.target.value)} required minLength={8} autoComplete="new-password" aria-describedby="reg-password-hint" />
              <button type="button" className="password-toggle" onClick={() => setShowPwd(!showPwd)} aria-label={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                {showPwd ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
            </div>
            <p id="reg-password-hint" className="form-hint">Tối thiểu 8 ký tự</p>
          </div>

          <p className="auth-note">
            Tài khoản mới được tạo với vai trò học viên. Quyền giáo viên do quản trị viên cấp.
          </p>

          <button id="reg-submit" type="submit" className="btn btn-primary btn-block btn-lg" aria-disabled={loading} aria-busy={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          </button>
        </form>

        <hr className="divider" />
        <p className="auth-footer-copy">
          Đã có tài khoản?{' '}
          <Link to="/login">Đăng nhập ngay</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

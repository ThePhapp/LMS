import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

const Register = () => {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <GraduationCap size={28} color="#fff" />
          </div>
          <h1 className="auth-title">Tạo tài khoản</h1>
          <p className="auth-subtitle">Tham gia Lớp Học Đổi Mới miễn phí ngay hôm nay</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Họ và tên</label>
            <input id="reg-name" type="text" className="form-input" value={form.name}
              onChange={e => set('name', e.target.value)} required autoComplete="name" placeholder="Nguyễn Văn A" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" className="form-input" value={form.email}
              onChange={e => set('email', e.target.value)} required autoComplete="email" placeholder="example@email.com" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Mật khẩu</label>
            <input id="reg-password" type="password" className="form-input" value={form.password}
              onChange={e => set('password', e.target.value)} required minLength={8} autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" />
          </div>

          <p className="auth-subtitle" style={{ marginBottom: '1rem' }}>
            Tài khoản mới được tạo với vai trò học viên. Quyền giáo viên do quản trị viên cấp.
          </p>

          <button id="reg-submit" type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          </button>
        </form>

        <hr className="divider" />
        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>Đăng nhập ngay</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

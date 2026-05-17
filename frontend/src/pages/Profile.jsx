import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import api from '../services/api';
import { assetUrl } from '../services/api';
import { User, Mail, Shield, Camera, Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const ROLE_LABELS = { student: 'Học viên / Student', lecturer: 'Giáo viên / Lecturer', admin: 'Quản trị viên / Admin' };
const ROLE_COLORS = { student: 'var(--primary)', lecturer: 'var(--warning)', admin: 'var(--error)' };

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const { t } = useLang();

  const [name, setName] = useState(user?.name || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';
  const avatarSrc = avatarPreview || (user?.avatar_url ? `${assetUrl(user.avatar_url)}?t=${avatarTimestamp}` : null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword && newPassword !== confirmPassword) {
      setError(t('profile_password_mismatch'));
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      if (avatarFile) fd.append('avatar', avatarFile);
      if (newPassword) {
        fd.append('currentPassword', currentPassword);
        fd.append('newPassword', newPassword);
      }

      const res = await api.patch('/auth/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      // Update localStorage + context with full response data
      localStorage.setItem('user', JSON.stringify(res.data));
      if (setUser) setUser(res.data);

      setSuccess(t('profile_save_success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setAvatarFile(null);
      setAvatarPreview(null);
      if (avatarFile) setAvatarTimestamp(Date.now());
    } catch (err) {
      setError(err.response?.data?.message || 'Cập nhật thất bại / Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="main-content" style={{ maxWidth: '800px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">{t('profile_title')}</h1>
        <p className="page-subtitle">{t('profile_subtitle')}</p>
      </div>

      <form onSubmit={handleSave}>
        {/* Avatar & Basic Info Card */}
        <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%',
                  background: avatarSrc ? 'transparent' : 'linear-gradient(135deg, var(--primary), var(--accent))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.5rem', fontWeight: 800, color: '#fff',
                  overflow: 'hidden', boxShadow: 'var(--shadow-md)'
                }}>
                  {avatarSrc
                    ? <img src={avatarSrc} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initial}
                </div>
                <label htmlFor="avatar-upload" style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
                  border: '2px solid var(--bg)'
                }}>
                  <Camera size={14} />
                  <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                </label>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('profile_change_avatar')}</div>
            </div>

            {/* Fields */}
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">
                  <User size={14} style={{ display: 'inline', marginRight: 6 }} />
                  {t('profile_name')}
                </label>
                <input
                  type="text" className="form-input" required
                  value={name} onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">
                  <Mail size={14} style={{ display: 'inline', marginRight: 6 }} />
                  {t('profile_email')}
                </label>
                <input
                  type="email" className="form-input" value={user?.email || ''}
                  readOnly style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>

              <div>
                <label className="form-label">
                  <Shield size={14} style={{ display: 'inline', marginRight: 6 }} />
                  {t('profile_role')}
                </label>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.4rem 1rem', borderRadius: '99px',
                  background: `${ROLE_COLORS[user?.role] || 'var(--primary)'}20`,
                  color: ROLE_COLORS[user?.role] || 'var(--primary)',
                  fontWeight: 700, fontSize: '0.9rem'
                }}>
                  {ROLE_LABELS[user?.role] || user?.role}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Card */}
        <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Lock size={20} />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t('profile_password_section')}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('profile_leave_blank')}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">{t('profile_current_password')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  className="form-input" style={{ paddingRight: '2.5rem' }}
                  value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('profile_new_password')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  className="form-input" style={{ paddingRight: '2.5rem' }}
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('profile_confirm_password')}</label>
              <input
                type="password" className="form-input"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        {/* Status Messages & Save */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>
        )}
        {success && (
          <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} /> {success}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? t('loading') : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;

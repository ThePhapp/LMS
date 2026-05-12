import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { LangContext } from '../contexts/LangContext';
import { GraduationCap, BookOpen, LogOut, MessageSquare, User, ChevronDown, Globe, Calendar, Menu, X } from 'lucide-react';
import { assetUrl } from '../services/api';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { lang, switchLang, t } = useContext(LangContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef(null);
  const langMenuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowUserMenu(false);
    setShowMobileMenu(false);
  };

  const handleNavClick = (path) => {
    if (!user) {
      navigate('/login', { state: { from: path } });
    } else {
      navigate(path);
    }
  };

  const isActive = (path) => location.pathname === path;

  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';
  const avatarUrl = user?.avatar_url ? assetUrl(user.avatar_url) : null;
  
  // Determine courses path based on user role
  const coursesPath = user?.role === 'lecturer' ? '/instructor/dashboard' : '/courses';
  const isCoursesActive = location.pathname === '/courses' || location.pathname === '/instructor/dashboard';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setShowLangMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <img src="/vinh.svg" alt="logo" style={{ height: 36 }} />
        <span className="nav-brand-text">Lớp Học Đổi Mới</span>
      </Link>

      {/* Desktop nav */}
      <div className="nav-links">
        {/* Navigation Links - Always visible */}
        <button 
          onClick={() => handleNavClick(coursesPath)}
          className={`nav-link ${isCoursesActive ? 'nav-link-active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            ...(isCoursesActive ? { color: 'var(--primary)', background: 'var(--primary-light)' } : {})
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={15} /> {t('nav_courses')}
          </span>
        </button>
        <button 
          onClick={() => handleNavClick('/timetable')}
          className={`nav-link ${isActive('/timetable') ? 'nav-link-active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            ...(isActive('/timetable') ? { color: 'var(--primary)', background: 'var(--primary-light)' } : {})
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={15} /> {t('nav_timetable')}
          </span>
        </button>
        <button 
          onClick={() => handleNavClick('/guide')}
          className={`nav-link ${isActive('/guide') ? 'nav-link-active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            ...(isActive('/guide') ? { color: 'var(--primary)', background: 'var(--primary-light)' } : {})
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={15} /> {t('nav_guide')}
          </span>
        </button>
        <button 
          onClick={() => handleNavClick('/forum')}
          className={`nav-link ${isActive('/forum') ? 'nav-link-active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            ...(isActive('/forum') ? { color: 'var(--primary)', background: 'var(--primary-light)' } : {})
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={15} /> {t('nav_forum')}
          </span>
        </button>

        {/* Language Switcher */}
        <div style={{ position: 'relative', marginLeft: '0.5rem', paddingLeft: '1rem', borderLeft: '1px solid var(--border)' }} ref={langMenuRef}>
              <button 
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="btn btn-ghost btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Globe size={16} />
                <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{lang.toUpperCase()}</span>
              </button>
              
              {showLangMenu && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.5rem)',
                  right: 0,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  minWidth: '140px',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  <button
                    onClick={() => {
                      switchLang('vi');
                      setShowLangMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.875rem',
                      textAlign: 'left',
                      border: 'none',
                      background: lang === 'vi' ? 'var(--primary-light)' : 'transparent',
                      color: lang === 'vi' ? 'var(--primary)' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: lang === 'vi' ? '600' : '400',
                      transition: 'background 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--primary-light)'}
                    onMouseLeave={(e) => e.target.style.background = lang === 'vi' ? 'var(--primary-light)' : 'transparent'}
                  >
                    <span style={{ fontSize: '1rem' }}>🇻🇳</span>
                    <span>Tiếng Việt</span>
                  </button>
                  <button
                    onClick={() => {
                      switchLang('en');
                      setShowLangMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.875rem',
                      textAlign: 'left',
                      border: 'none',
                      background: lang === 'en' ? 'var(--primary-light)' : 'transparent',
                      color: lang === 'en' ? 'var(--primary)' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: lang === 'en' ? '600' : '400',
                      transition: 'background 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--primary-light)'}
                    onMouseLeave={(e) => e.target.style.background = lang === 'en' ? 'var(--primary-light)' : 'transparent'}
                  >
                    <span style={{ fontSize: '1rem' }}>🇬🇧</span>
                    <span>English</span>
                  </button>
                </div>
              )}
            </div>

            {/* User Menu - Only when logged in */}
            {user && (
            <div style={{ position: 'relative', marginLeft: '0.5rem' }} ref={userMenuRef}>
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="nav-user"
                style={{ 
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.5rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div className="avatar" style={{ overflow: 'hidden' }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    initial
                  )}
                </div>
                <span style={{ color: 'var(--text)', fontSize: '0.875rem' }}>{user.name}</span>
                <span className="badge badge-primary">{user.role}</span>
                <ChevronDown size={16} style={{ color: 'var(--text-light)' }} />
              </button>

              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.5rem)',
                  right: 0,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  minWidth: '200px',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  <Link
                    to={coursesPath}
                    onClick={() => setShowUserMenu(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      color: 'var(--text)',
                      textDecoration: 'none',
                      transition: 'background 0.2s',
                      borderBottom: '1px solid var(--border)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <BookOpen size={16} />
                    <span style={{ fontSize: '0.875rem' }}>{t('nav_courses')}</span>
                  </Link>
                  
                  <Link
                    to="/profile"
                    onClick={() => setShowUserMenu(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      color: 'var(--text)',
                      textDecoration: 'none',
                      transition: 'background 0.2s',
                      borderBottom: '1px solid var(--border)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <User size={16} />
                    <span style={{ fontSize: '0.875rem' }}>{t('nav_profile')}</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--danger)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={16} />
                    <span>{t('nav_logout')}</span>
                  </button>
                </div>
              )}
            </div>
            )}

            {/* Login/Register - Only when not logged in */}
            {!user && (
            <div style={{ marginLeft: '0.5rem' }}>
              <Link to="/login" className="btn btn-secondary btn-sm">{t('nav_login')}</Link>
              <Link to="/register" className="btn btn-primary btn-sm" style={{ marginLeft: '0.5rem' }}>Đăng ký</Link>
            </div>
            )}
          </div>

        {/* Hamburger button - mobile only */}
        <button className="nav-hamburger" onClick={() => setShowMobileMenu(true)} aria-label="Mở menu">
          <Menu size={24} />
        </button>

        {/* Mobile overlay */}
        <div
          className={`nav-mobile-overlay ${showMobileMenu ? 'open' : ''}`}
        onClick={() => setShowMobileMenu(false)}
        onKeyDown={e => e.key === 'Escape' && setShowMobileMenu(false)}
        role="button"
        tabIndex={-1}
        aria-label="Đóng menu"
      />

      {/* Mobile drawer */}
      <div className={`nav-mobile-drawer ${showMobileMenu ? 'open' : ''}`}>
        <div className="nav-mobile-header">
          <Link to="/" className="nav-brand" onClick={() => setShowMobileMenu(false)}>
            <img src="/vinh.svg" alt="logo" style={{ height: 30 }} />
            <span>Lớp Học Đổi Mới</span>
          </Link>
          <button className="nav-mobile-close" onClick={() => setShowMobileMenu(false)}>
            <X size={22} />
          </button>
        </div>

        {user && (
          <div className="nav-mobile-user">
            <div className="avatar" style={{ overflow: 'hidden', flexShrink: 0 }}>
              {user.avatar_url ? (
                <img src={assetUrl(user.avatar_url)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user.name?.charAt(0)?.toUpperCase()
              )}
            </div>
            <div className="nav-mobile-user-info">
              <span className="nav-mobile-user-name">{user.name}</span>
              <span className="nav-mobile-user-role">{user.role}</span>
            </div>
          </div>
        )}

        <div className="nav-mobile-links">
          {/* Navigation Links - Always visible */}
          <button 
            onClick={() => {
              handleNavClick(coursesPath);
              setShowMobileMenu(false);
            }}
            className={`nav-mobile-link ${isCoursesActive ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
          >
            <BookOpen size={18} /> {t('nav_courses')}
          </button>
          <button 
            onClick={() => {
              handleNavClick('/timetable');
              setShowMobileMenu(false);
            }}
            className={`nav-mobile-link ${isActive('/timetable') ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
          >
            <Calendar size={18} /> {t('nav_timetable')}
          </button>
          <button 
            onClick={() => {
              handleNavClick('/guide');
              setShowMobileMenu(false);
            }}
            className={`nav-mobile-link ${isActive('/guide') ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
          >
            <MessageSquare size={18} /> {t('nav_guide')}
          </button>
          <button 
            onClick={() => {
              handleNavClick('/forum');
              setShowMobileMenu(false);
            }}
            className={`nav-mobile-link ${isActive('/forum') ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
          >
            <MessageSquare size={18} /> {t('nav_forum')}
          </button>

          {/* User Profile - Only when logged in */}
          {user && (
            <>
              <Link to="/profile" className={`nav-mobile-link ${isActive('/profile') ? 'active' : ''}`} onClick={() => setShowMobileMenu(false)}>
                <User size={18} /> {t('nav_profile')}
              </Link>
              <button className="nav-mobile-link-btn" onClick={handleLogout}>
                <LogOut size={18} /> {t('nav_logout')}
              </button>
            </>
          )}

          {/* Login/Register - Only when not logged in */}
          {!user && (
            <>
              <Link to="/login" className="nav-mobile-link" onClick={() => setShowMobileMenu(false)}>
                <User size={18} /> {t('nav_login')}
              </Link>
              <Link to="/register" className="nav-mobile-link" onClick={() => setShowMobileMenu(false)}>
                <GraduationCap size={18} /> Đăng ký dùng thử
              </Link>
            </>
          )}
        </div>

        <div className="nav-mobile-footer">
          <button className={`nav-mobile-lang-btn ${lang === 'vi' ? 'active' : ''}`} onClick={() => switchLang('vi')}>
            🇻🇳 VI
          </button>
          <button className={`nav-mobile-lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => switchLang('en')}>
            🇬🇧 EN
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

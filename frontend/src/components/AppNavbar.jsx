import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Calendar,
  ChevronDown,
  Globe,
  GraduationCap,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  User,
  X,
} from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { LangContext } from '../contexts/langContextValue';
import api, { assetUrl } from '../services/api';

const requestNotifications = () => api.get('/assignments/notifications');

const ROLE_LABELS = {
  admin: 'Quản trị viên',
  lecturer: 'Giảng viên',
  student: 'Học viên',
};

function UserAvatar({ user, size = 'default' }) {
  const avatarUrl = user?.avatar_url ? assetUrl(user.avatar_url) : null;
  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <span className={`avatar ${size === 'large' ? 'avatar-lg' : ''}`} aria-hidden="true">
      {avatarUrl ? <img src={avatarUrl} alt="" /> : initial}
    </span>
  );
}

const AppNavbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { lang, switchLang, t } = useContext(LangContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const userMenuRef = useRef(null);
  const langMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    const loadNotifications = () => requestNotifications()
      .then((res) => {
        if (cancelled) return;
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      })
      .catch((error) => console.error('Lỗi lấy thông báo', error));

    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setShowUserMenu(false);
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) setShowLangMenu(false);
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) setShowNotifMenu(false);
    };
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      setShowUserMenu(false);
      setShowLangMenu(false);
      setShowNotifMenu(false);
      setShowMobileMenu(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const coursesPath = user?.role === 'lecturer' ? '/instructor/dashboard' : '/courses';
  const isCoursesActive = location.pathname === '/courses' || location.pathname.startsWith('/instructor');
  const isActive = (path) => location.pathname === path;
  const navItems = [
    { label: t('nav_courses'), path: coursesPath, icon: BookOpen, active: isCoursesActive },
    { label: t('nav_timetable'), path: '/timetable', icon: Calendar, active: isActive('/timetable') },
    { label: t('nav_guide'), path: '/guide', icon: MessageSquare, active: isActive('/guide') },
    { label: t('nav_forum'), path: '/forum', icon: MessageSquare, active: isActive('/forum') },
  ];

  const closeMenus = () => {
    setShowUserMenu(false);
    setShowLangMenu(false);
    setShowNotifMenu(false);
  };

  const handleNavClick = (path) => {
    closeMenus();
    setShowMobileMenu(false);
    if (!user) navigate('/login', { state: { from: path } });
    else navigate(path);
  };

  const handleLogout = () => {
    logout();
    closeMenus();
    setShowMobileMenu(false);
    navigate('/login');
  };

  const markAsRead = async (id = 'all') => {
    try {
      await api.put(`/assignments/notifications/${id}/read`);
      const res = await requestNotifications();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (error) {
      console.error('Lỗi cập nhật thông báo', error);
    }
  };

  const openNotification = (notification) => {
    if (!notification.is_read) markAsRead(notification.id);
    if (['grade_posted', 'quiz_posted', 'assignment_posted'].includes(notification.type)) {
      navigate(`/assignments/${notification.reference_id}`);
    } else if (notification.type === 'submission_received') {
      navigate(`/instructor/assignment/${notification.reference_id}/grading`);
    }
    setShowNotifMenu(false);
  };

  const selectLanguage = (nextLanguage) => {
    switchLang(nextLanguage);
    setShowLangMenu(false);
  };

  return (
    <nav className="navbar" aria-label="Điều hướng chính">
      <Link to="/" className="nav-brand" aria-label="Lớp Học Đổi Mới - Trang chủ">
        <img src="/vinh.svg" alt="" className="nav-brand-logo" />
        <span className="nav-brand-text">Lớp Học Đổi Mới</span>
      </Link>

      <div className="nav-links" aria-label="Liên kết chính">
        {navItems.map(({ label, path, icon, active }) => (
          <button
            key={path}
            type="button"
            className={`nav-link ${active ? 'nav-link-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => handleNavClick(path)}
          >
            {React.createElement(icon, { size: 16, 'aria-hidden': true })}
            <span>{label}</span>
          </button>
        ))}

        <span className="nav-divider" aria-hidden="true" />

        <div className="nav-menu-anchor" ref={langMenuRef}>
          <button
            type="button"
            className="nav-icon-button nav-language-button"
            aria-label="Chọn ngôn ngữ"
            aria-haspopup="menu"
            aria-expanded={showLangMenu}
            onClick={() => {
              setShowLangMenu((current) => !current);
              setShowNotifMenu(false);
              setShowUserMenu(false);
            }}
          >
            <Globe size={17} aria-hidden="true" />
            <span>{lang.toUpperCase()}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {showLangMenu && (
            <div className="nav-dropdown nav-language-menu" role="menu" aria-label="Ngôn ngữ">
              <button type="button" role="menuitemradio" aria-checked={lang === 'vi'} className={lang === 'vi' ? 'is-selected' : ''} onClick={() => selectLanguage('vi')}>
                <span aria-hidden="true">🇻🇳</span> Tiếng Việt
              </button>
              <button type="button" role="menuitemradio" aria-checked={lang === 'en'} className={lang === 'en' ? 'is-selected' : ''} onClick={() => selectLanguage('en')}>
                <span aria-hidden="true">🇬🇧</span> English
              </button>
            </div>
          )}
        </div>

        {user && (
          <div className="nav-menu-anchor" ref={notifMenuRef}>
            <button
              type="button"
              className="nav-icon-button"
              aria-label={unreadCount ? `${unreadCount} thông báo chưa đọc` : 'Thông báo'}
              aria-haspopup="menu"
              aria-expanded={showNotifMenu}
              onClick={() => {
                setShowNotifMenu((current) => !current);
                setShowLangMenu(false);
                setShowUserMenu(false);
              }}
            >
              <Bell size={18} aria-hidden="true" />
              {unreadCount > 0 && <span className="nav-notification-count">{Math.min(unreadCount, 99)}</span>}
            </button>
            {showNotifMenu && (
              <section className="nav-dropdown nav-notification-panel" aria-label="Thông báo">
                <header className="nav-dropdown-header">
                  <strong>Thông báo</strong>
                  {unreadCount > 0 && <button type="button" onClick={() => markAsRead('all')}>Đánh dấu đã đọc</button>}
                </header>
                <div className="nav-notification-list">
                  {notifications.length === 0 ? (
                    <p className="nav-dropdown-empty">Không có thông báo mới</p>
                  ) : notifications.map((notification) => (
                    <button
                      type="button"
                      key={notification.id}
                      className={`nav-notification-item ${notification.is_read ? '' : 'is-unread'}`}
                      onClick={() => openNotification(notification)}
                    >
                      <span className="nav-notification-title">{notification.title}</span>
                      {notification.message && <span className="nav-notification-message">{notification.message}</span>}
                      <time dateTime={notification.created_at}>{new Date(notification.created_at).toLocaleString('vi-VN')}</time>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {user ? (
          <div className="nav-menu-anchor" ref={userMenuRef}>
            <button
              type="button"
              className="nav-user-button"
              aria-haspopup="menu"
              aria-expanded={showUserMenu}
              onClick={() => {
                setShowUserMenu((current) => !current);
                setShowLangMenu(false);
                setShowNotifMenu(false);
              }}
            >
              <UserAvatar user={user} />
              <span className="nav-user-copy">
                <strong>{user.name}</strong>
                <small>{ROLE_LABELS[user.role] || user.role}</small>
              </span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>
            {showUserMenu && (
              <div className="nav-dropdown nav-user-menu" role="menu">
                <Link role="menuitem" to={coursesPath} onClick={() => setShowUserMenu(false)}><BookOpen size={16} aria-hidden="true" />{t('nav_courses')}</Link>
                {user.role === 'admin' && <Link role="menuitem" to="/admin" onClick={() => setShowUserMenu(false)}><Settings size={16} aria-hidden="true" />Quản trị hệ thống</Link>}
                <Link role="menuitem" to="/profile" onClick={() => setShowUserMenu(false)}><User size={16} aria-hidden="true" />{t('nav_profile')}</Link>
                <button type="button" role="menuitem" className="nav-danger-item" onClick={handleLogout}><LogOut size={16} aria-hidden="true" />{t('nav_logout')}</button>
              </div>
            )}
          </div>
        ) : (
          <div className="nav-auth-actions">
            <Link to="/login" className="btn btn-secondary btn-sm">{t('nav_login')}</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Đăng ký</Link>
          </div>
        )}
      </div>

      <button type="button" className="nav-hamburger" onClick={() => setShowMobileMenu(true)} aria-label="Mở menu">
        <Menu size={22} aria-hidden="true" />
      </button>

      <button
        type="button"
        className={`nav-mobile-overlay ${showMobileMenu ? 'open' : ''}`}
        onClick={() => setShowMobileMenu(false)}
        aria-label="Đóng menu"
        tabIndex={showMobileMenu ? 0 : -1}
      />
      <aside className={`nav-mobile-drawer ${showMobileMenu ? 'open' : ''}`} aria-label="Menu di động" aria-hidden={!showMobileMenu}>
        <div className="nav-mobile-header">
          <Link to="/" className="nav-brand" onClick={() => setShowMobileMenu(false)}>
            <img src="/vinh.svg" alt="" className="nav-brand-logo" />
            <span>Lớp Học Đổi Mới</span>
          </Link>
          <button type="button" className="nav-mobile-close" onClick={() => setShowMobileMenu(false)} aria-label="Đóng menu"><X size={20} aria-hidden="true" /></button>
        </div>

        {user && (
          <div className="nav-mobile-user">
            <UserAvatar user={user} size="large" />
            <span className="nav-mobile-user-info">
              <strong>{user.name}</strong>
              <small>{ROLE_LABELS[user.role] || user.role}</small>
            </span>
          </div>
        )}

        <div className="nav-mobile-links">
          {navItems.map(({ label, path, icon, active }) => (
            <button key={path} type="button" className={`nav-mobile-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => handleNavClick(path)}>
              {React.createElement(icon, { size: 18, 'aria-hidden': true })} {label}
            </button>
          ))}
          {user ? (
            <>
              <Link to="/profile" className={`nav-mobile-link ${isActive('/profile') ? 'active' : ''}`} onClick={() => setShowMobileMenu(false)}><User size={18} aria-hidden="true" />{t('nav_profile')}</Link>
              {user.role === 'admin' && <Link to="/admin" className={`nav-mobile-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`} onClick={() => setShowMobileMenu(false)}><Settings size={18} aria-hidden="true" />Quản trị hệ thống</Link>}
              <button type="button" className="nav-mobile-link nav-mobile-logout" onClick={handleLogout}><LogOut size={18} aria-hidden="true" />{t('nav_logout')}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-mobile-link" onClick={() => setShowMobileMenu(false)}><User size={18} aria-hidden="true" />{t('nav_login')}</Link>
              <Link to="/register" className="nav-mobile-link" onClick={() => setShowMobileMenu(false)}><GraduationCap size={18} aria-hidden="true" />Đăng ký</Link>
            </>
          )}
        </div>

        <div className="nav-mobile-footer" aria-label="Ngôn ngữ">
          <button type="button" className={lang === 'vi' ? 'active' : ''} aria-pressed={lang === 'vi'} onClick={() => selectLanguage('vi')}>🇻🇳 Tiếng Việt</button>
          <button type="button" className={lang === 'en' ? 'active' : ''} aria-pressed={lang === 'en'} onClick={() => selectLanguage('en')}>🇬🇧 English</button>
        </div>
      </aside>
    </nav>
  );
};

export default AppNavbar;

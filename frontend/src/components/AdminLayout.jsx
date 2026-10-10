import React, { useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  X,
} from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { assetUrl } from '../services/api';

const navItems = [
  { name: 'Tổng quan', path: '/admin', icon: LayoutDashboard, end: true },
  { name: 'Khoá học', path: '/admin/courses', icon: BookOpen },
];

const AdminLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';
  const avatarUrl = user?.avatar_url ? assetUrl(user.avatar_url) : null;

  return (
    <div className="admin-layout">
      {isSidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Đóng menu quản trị"
        />
      )}

      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`} aria-label="Điều hướng quản trị">
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <span className="admin-brand-icon"><LayoutDashboard size={18} aria-hidden="true" /></span>
            <span>LMS Admin</span>
          </div>
          <button type="button" className="admin-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu quản trị">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          <span className="admin-nav-label">Quản trị</span>
          {navItems.map(({ name, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              {React.createElement(Icon, { size: 18, 'aria-hidden': true })}
              <span>{name}</span>
              <ChevronRight className="admin-nav-chevron" size={14} aria-hidden="true" />
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button type="button" className="admin-logout" onClick={handleLogout}>
            <LogOut size={18} aria-hidden="true" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="admin-main-wrapper">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button type="button" className="admin-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Mở menu quản trị">
              <Menu size={22} aria-hidden="true" />
            </button>
            <div className="admin-search">
              <Search className="admin-search-icon" size={16} aria-hidden="true" />
              <input className="admin-search-input" type="search" placeholder="Tìm kiếm..." aria-label="Tìm kiếm trong trang quản trị" />
            </div>
          </div>
          <div className="admin-topbar-right">
            <button type="button" className="admin-icon-btn" aria-label="Thông báo">
              <Bell size={19} aria-hidden="true" />
              <span className="admin-notification-dot" aria-hidden="true" />
            </button>
            <span className="admin-topbar-divider" aria-hidden="true" />
            <div className="admin-user-profile">
              <div className="admin-user-copy">
                <strong>{user?.name}</strong>
                <small>{user?.role}</small>
              </div>
              <span className="admin-user-avatar">
                {avatarUrl ? <img src={avatarUrl} alt="" /> : initial}
              </span>
            </div>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;

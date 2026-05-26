import React, { useState, useEffect } from 'react';
import { Users, BookOpen, UserPlus, TrendingUp, Search, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

const ROLE_CONFIG = {
  admin: { label: 'Admin', bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' },
  lecturer: { label: 'Giảng viên', bg: '#EDE9FE', color: '#7C3AED', border: '#C4B5FD' },
  student: { label: 'Học sinh', bg: '#DBEAFE', color: '#2563EB', border: '#93C5FD' },
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalCourses: 0, totalEnrollments: 0 });
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/dashboard-stats');
      setStats(response.data.stats);
      setUsers(response.data.users);
      setFilteredUsers(response.data.users);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdminData(); }, []);

  useEffect(() => {
    let result = users;
    if (roleFilter !== 'all') result = result.filter(u => u.role === roleFilter);
    if (searchQuery) result = result.filter(u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(result);
  }, [searchQuery, roleFilter, users]);

  const statCards = [
    {
      title: 'Tổng người dùng',
      value: stats.totalUsers,
      icon: <Users size={22} color="#6366F1" />,
      iconBg: '#EEF2FF',
      accent: '#6366F1',
      change: '+' + stats.totalUsers,
    },
    {
      title: 'Khoá học',
      value: stats.totalCourses,
      icon: <BookOpen size={22} color="#8B5CF6" />,
      iconBg: '#EDE9FE',
      accent: '#8B5CF6',
      change: '+' + stats.totalCourses,
    },
    {
      title: 'Lượt đăng ký',
      value: stats.totalEnrollments,
      icon: <UserPlus size={22} color="#06B6D4" />,
      iconBg: '#CFFAFE',
      accent: '#06B6D4',
      change: '+' + stats.totalEnrollments,
    },
    {
      title: 'Tỷ lệ đăng ký',
      value: stats.totalUsers > 0 ? (stats.totalEnrollments / stats.totalUsers).toFixed(1) : '0',
      icon: <TrendingUp size={22} color="#10B981" />,
      iconBg: '#D1FAE5',
      accent: '#10B981',
      change: 'lượt/người',
      isRate: true,
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400 }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '0.9rem' }}>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{
          background: '#FEE2E2',
          border: '1px solid #FCA5A5',
          color: '#DC2626',
          padding: '1rem 1.25rem',
          borderRadius: 12,
          borderLeft: '4px solid #EF4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>{error}</span>
          <button onClick={fetchAdminData} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', marginBottom: 4 }}>
          Tổng quan hệ thống
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
          Theo dõi người dùng và thống kê hệ thống LMS
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}>
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            style={{
              background: '#fff',
              border: '1px solid #E2E8F0',
              borderRadius: 16,
              padding: '1.25rem 1.5rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              cursor: 'default',
              transition: 'box-shadow 0.2s, transform 0.2s',
              position: 'relative',
              overflow: 'hidden',
            }}
            whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
          >
            <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '50%', background: card.iconBg, transform: 'translate(25%, -25%)', opacity: 0.6 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', position: 'relative' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {card.icon}
              </div>
              <span style={{ fontSize: '0.72rem', color: card.accent, background: card.iconBg, padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                {card.change}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              {card.title}
            </div>
            <div style={{ fontSize: card.isRate ? '2rem' : '2.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-1px', lineHeight: 1 }}>
              {card.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Table Toolbar */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          background: '#FAFAFA',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={18} color="#6366F1" />
            <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>Danh sách người dùng</h2>
            <span style={{
              background: '#EEF2FF',
              color: '#6366F1',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 10px',
              borderRadius: 999,
            }}>
              {filteredUsers.length}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Role filter */}
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'student', 'lecturer', 'admin'].map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: 999,
                    border: '1.5px solid',
                    borderColor: roleFilter === r ? '#6366F1' : '#E2E8F0',
                    background: roleFilter === r ? '#6366F1' : '#fff',
                    color: roleFilter === r ? '#fff' : '#64748B',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {r === 'all' ? 'Tất cả' : r === 'lecturer' ? 'Giảng viên' : r === 'student' ? 'Học sinh' : 'Admin'}
                </button>
              ))}
            </div>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Tìm tên, email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem 0.4rem 2rem',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: 999,
                  fontSize: '0.8rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                  color: '#0F172A',
                  width: 180,
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#6366F1'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>
            {/* Refresh */}
            <button
              onClick={fetchAdminData}
              style={{
                width: 34, height: 34,
                borderRadius: '50%',
                background: 'transparent',
                border: '1.5px solid #E2E8F0',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748B',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.color = '#6366F1'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B'; }}
              title="Làm mới"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['#', 'Người dùng', 'Email', 'Vai trò'].map(col => (
                  <th key={col} style={{
                    padding: '0.875rem 1.25rem',
                    textAlign: 'left',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    whiteSpace: 'nowrap',
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, idx) => {
                const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.student;
                return (
                  <tr
                    key={u.id}
                    style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.875rem 1.25rem', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, width: 50 }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 38, height: 38,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          overflow: 'hidden',
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(99,102,241,0.25)',
                        }}>
                          {u.avatar_url
                            ? <img src={u.avatar_url} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : u.name.charAt(0).toUpperCase()
                          }
                        </div>
                        <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.9rem' }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem', color: '#64748B', fontSize: '0.875rem' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '3px 12px',
                        borderRadius: 999,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: cfg.bg,
                        color: cfg.color,
                        border: `1px solid ${cfg.border}`,
                      }}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;

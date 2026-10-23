import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, RefreshCw, TrendingUp, UserPlus, Users } from 'lucide-react';
import api, { assetUrl } from '../services/api';
import { EmptyState, ErrorState, PageLoadingState } from '../components/ui/Feedback';
import {
  FilterTabs,
  MetricCard,
  PageHeader,
  SearchField,
  SectionHeader,
  StatusBadge,
} from '../components/ui/AppUI';
import { initials } from '../components/ui/utils';

const ROLE_CONFIG = {
  admin: { label: 'Quản trị viên', tone: 'danger' },
  lecturer: { label: 'Giảng viên', tone: 'warning' },
  student: { label: 'Học viên', tone: 'neutral' },
};

const ROLE_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'student', label: 'Học viên' },
  { value: 'lecturer', label: 'Giảng viên' },
  { value: 'admin', label: 'Quản trị' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, totalCourses: 0, totalEnrollments: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/dashboard-stats');
      setStats(response.data.stats || {});
      setUsers(response.data.users || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải dữ liệu quản trị.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdminData(); }, []);

  const filteredUsers = useMemo(() => users.filter((user) => {
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const query = searchQuery.trim().toLocaleLowerCase('vi');
    const matchesSearch = !query || user.name.toLocaleLowerCase('vi').includes(query) || user.email.toLocaleLowerCase('vi').includes(query);
    return matchesRole && matchesSearch;
  }), [roleFilter, searchQuery, users]);

  if (loading) return <PageLoadingState label="Đang tải dữ liệu quản trị" />;
  if (error) return <ErrorState title="Không thể tải dữ liệu quản trị" detail={error} onRetry={fetchAdminData} />;

  const registrationRate = Number(stats.totalUsers) > 0 ? (Number(stats.totalEnrollments) / Number(stats.totalUsers)).toFixed(1) : '0';

  return (
    <div className="admin-page admin-dashboard-page">
      <PageHeader
        eyebrow="Quản trị hệ thống"
        title="Tổng quan"
        description="Theo dõi quy mô hệ thống và quản lý người dùng từ cùng một màn hình."
        action={<button type="button" className="btn btn-secondary" onClick={fetchAdminData}><RefreshCw size={16} aria-hidden="true" />Làm mới</button>}
      />

      <div className="metric-grid metric-grid-four">
        <MetricCard icon={Users} label="Người dùng" value={stats.totalUsers || 0} detail="tất cả vai trò" tone="indigo" />
        <MetricCard icon={BookOpen} label="Khóa học" value={stats.totalCourses || 0} detail="trên hệ thống" tone="violet" />
        <MetricCard icon={UserPlus} label="Lượt đăng ký" value={stats.totalEnrollments || 0} detail="vào các khóa học" tone="sky" />
        <MetricCard icon={TrendingUp} label="Đăng ký/người" value={registrationRate} detail="tỷ lệ trung bình" tone="teal" />
      </div>

      <section className="app-section admin-users-section">
        <SectionHeader title="Người dùng" description={`${filteredUsers.length} người dùng trong kết quả hiện tại.`} />
        <div className="list-toolbar admin-users-toolbar">
          <FilterTabs label="Lọc theo vai trò" value={roleFilter} options={ROLE_FILTERS} onChange={setRoleFilter} />
          <SearchField value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm tên hoặc email" label="Tìm người dùng" />
        </div>

        {filteredUsers.length === 0 ? (
          <EmptyState><p>Không có người dùng nào khớp với bộ lọc hiện tại.</p></EmptyState>
        ) : (
          <>
            <div className="data-table-wrap admin-users-table">
              <table>
                <thead><tr><th>Người dùng</th><th>Email</th><th>Vai trò</th></tr></thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const role = ROLE_CONFIG[user.role] || ROLE_CONFIG.student;
                    return (
                      <tr key={user.id}>
                        <td><div className="person-cell"><span className="person-avatar">{user.avatar_url ? <img src={assetUrl(user.avatar_url)} alt="" /> : initials(user.name)}</span><strong>{user.name}</strong></div></td>
                        <td className="email-cell">{user.email}</td>
                        <td><StatusBadge tone={role.tone}>{role.label}</StatusBadge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="admin-user-list">
              {filteredUsers.map((user) => {
                const role = ROLE_CONFIG[user.role] || ROLE_CONFIG.student;
                return (
                  <article className="admin-user-row" key={user.id}>
                    <span className="person-avatar">{user.avatar_url ? <img src={assetUrl(user.avatar_url)} alt="" /> : initials(user.name)}</span>
                    <div><strong>{user.name}</strong><span>{user.email}</span></div>
                    <StatusBadge tone={role.tone}>{role.label}</StatusBadge>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

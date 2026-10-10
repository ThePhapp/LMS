import React, { useCallback, useEffect, useState, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { assetUrl } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { ArrowLeft, Users, BookOpen, CheckCircle2, Clock, TrendingUp, Eye, Search } from 'lucide-react';

const CourseStudents = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStudents = useCallback(async () => {
    try {
      const res = await api.get(`/enrollments/course/${courseId}/students`);
      setData(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi tải dữ liệu');
      navigate('/instructor/dashboard');
    } finally {
      setLoading(false);
    }
  }, [courseId, navigate]);

  useEffect(() => {
    if (user && user.role !== 'lecturer' && user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchStudents();
  }, [fetchStudents, navigate, user]);

  if (loading) return <div className="loading-wrapper"><div className="spinner" /><p>Đang tải...</p></div>;
  if (!data) return null;

  const filteredStudents = data.students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const avgProgress = data.students.length > 0
    ? (data.students.reduce((acc, s) => acc + (parseFloat(s.progress_percentage) || 0), 0) / data.students.length).toFixed(1)
    : 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Chưa có';
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="main-content">
      <button 
        className="btn btn-ghost btn-sm" 
        style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }} 
        onClick={() => navigate('/instructor/dashboard')}
      >
        <ArrowLeft size={16} /> Quay lại Dashboard
      </button>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Học viên - {data.course.title}</h1>
        <p className="page-subtitle">Theo dõi tiến độ và thống kê học tập của từng học viên</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: 50, height: 50, borderRadius: '12px', 
              background: 'var(--primary-light)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{data.students.length}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tổng học viên</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: 50, height: 50, borderRadius: '12px', 
              background: 'var(--warning-light)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--warning)'
            }}>
              <BookOpen size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{data.course.total_lessons}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tổng bài học</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: 50, height: 50, borderRadius: '12px', 
              background: '#dcfce7', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#16a34a'
            }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{avgProgress}%</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tiến độ TB</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="search-bar" style={{ maxWidth: '400px' }}>
          <span className="search-bar-icon"><Search size={16} /></span>
          <input
            placeholder="Tìm kiếm học viên theo tên hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="card">
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Danh sách học viên ({filteredStudents.length})
          </h3>
        </div>

        {filteredStudents.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {searchTerm ? 'Không tìm thấy học viên phù hợp' : 'Chưa có học viên nào đăng ký khóa học này'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Học viên</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Ngày đăng ký</th>
                  <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Tiến độ</th>
                  <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Bài hoàn thành</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Hoạt động gần nhất</th>
                  <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const progress = parseFloat(student.progress_percentage) || 0;
                  const avatarUrl = student.avatar_url ? assetUrl(student.avatar_url) : null;
                  const initial = student.name.charAt(0).toUpperCase();

                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--primary), var(--accent))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem', fontWeight: 700, color: '#fff',
                            overflow: 'hidden', flexShrink: 0
                          }}>
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : initial}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{student.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                        {formatDate(student.enrolled_at)}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ 
                            width: '100%', maxWidth: '120px', height: '8px', 
                            background: 'var(--surface-2)', borderRadius: '99px', overflow: 'hidden' 
                          }}>
                            <div style={{ 
                              width: `${progress}%`, height: '100%', 
                              background: progress >= 75 ? '#16a34a' : progress >= 50 ? '#eab308' : 'var(--primary)',
                              borderRadius: '99px', transition: 'width 0.3s'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                            {progress}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          fontSize: '0.9rem', fontWeight: 600 
                        }}>
                          <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                          {student.completed_lessons} / {data.course.total_lessons}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                          {formatDate(student.last_activity)}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <Link
                          to={`/instructor/course/${courseId}/student/${student.id}`}
                          className="btn btn-sm btn-ghost"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <Eye size={14} /> Xem chi tiết
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseStudents;

import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { assetUrl } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, BarChart2, Book, Users, Star, Eye, GraduationCap } from 'lucide-react';

const CATEGORY_LABELS = { Math: 'Toán', Vietnamese: 'Tiếng Việt', English: 'Tiếng Anh', Ethics: 'Đạo đức', Nature: 'Tự nhiên & XH', Science: 'Khoa học', HistoryGeography: 'Lịch sử và địa lý', Music: 'Âm nhạc', Arts: 'Mỹ thuật' };
const LEVEL_LABELS = { Semester1: 'Học kỳ 1', Semester2: 'Học kỳ 2' };

const InstructorDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'lecturer' && user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      const myCourses = user.role === 'admin'
        ? res.data
        : res.data.filter(c => c.lecturer_id === user.id);
      setCourses(myCourses);
    } catch { }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khóa học này? Mọi dữ liệu sẽ bị mất.')) return;
    try {
      await api.delete(`/courses/${id}`);
      fetchCourses();
    } catch {
      alert('Lỗi xóa khóa học');
    }
  };

  if (loading) return <div className="loading-wrapper"><div className="spinner" /></div>;

  const totalStudents = courses.reduce((acc, c) => acc + (parseInt(c.student_count) || 0), 0);
  const totalRevenue = courses.reduce((acc, c) => acc + ((parseInt(c.student_count) || 0) * (parseFloat(c.price) || 0)), 0);

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Quản lý giảng dạy</h1>
          <p className="page-subtitle">Xin chào, <strong>{user?.name}</strong> — Quản lý và theo dõi các khóa học của bạn</p>
        </div>
        <Link to="/instructor/course/create" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          <Plus size={16} /> Tạo khóa học mới
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}><Book size={22} /></div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{courses.length}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>Khóa học đã tạo</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ca8a04', flexShrink: 0 }}><Users size={22} /></div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{totalStudents}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>Tổng học sinh</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}><BarChart2 size={22} /></div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>${totalRevenue.toFixed(0)}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>Doanh thu ước tính</div>
          </div>
        </div>
      </div>

      {/* Course Cards */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Danh sách khóa học ({courses.length})</h3>
      </div>

      {courses.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <GraduationCap size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p style={{ marginBottom: '1rem' }}>Chưa có khóa học nào.</p>
          <Link to="/instructor/course/create" className="btn btn-primary"><Plus size={16} /> Tạo khóa học đầu tiên</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {courses.map(course => (
            <div key={course.id} className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Thumbnail */}
              <div style={{ height: 140, background: 'var(--surface-2)', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                {course.thumbnail_url
                  ? <img src={assetUrl(course.thumbnail_url)} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><GraduationCap size={40} /></div>
                }
                <span className="badge badge-primary" style={{ position: 'absolute', top: 8, left: 8, fontSize: '0.75rem' }}>
                  {CATEGORY_LABELS[course.category] || course.category}
                </span>
                {course.level && (
                  <span className="badge badge-purple" style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.75rem' }}>
                    {LEVEL_LABELS[course.level] || course.level}
                  </span>
                )}
              </div>

              {/* Body */}
              <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '1rem', margin: 0, lineHeight: 1.4 }}>
                  <Link to={`/courses/${course.id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>{course.title}</Link>
                </h4>

                {/* Lecturer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <GraduationCap size={13} />
                  <span>{course.lecturer_name || user?.name}</span>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={13} /> {course.student_count || 0} học sinh</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#eab308' }}><Star size={13} fill="currentColor" /><span style={{ color: 'var(--text-muted)' }}>{parseFloat(course.rating || 0).toFixed(1)}</span></span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600, color: course.price > 0 ? 'var(--primary)' : '#16a34a' }}>
                    {course.price > 0 ? `$${course.price}` : 'Mở đăng ký'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
                <Link to={`/courses/${course.id}`} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 5 }} title="Xem">
                  <Eye size={14} /> Xem
                </Link>
                <Link to={`/instructor/course/${course.id}/students`} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 5 }} title="Học sinh">
                  <Users size={14} /> Học sinh
                </Link>
                <Link to={`/instructor/course/${course.id}/edit`} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Edit size={14} /> Sửa
                </Link>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)', padding: '0.4rem 0.6rem' }} onClick={() => handleDelete(course.id)} title="Xóa">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InstructorDashboard;

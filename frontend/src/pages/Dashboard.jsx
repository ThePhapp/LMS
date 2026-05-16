import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { assetUrl } from '../services/api';
import { BookOpen, GraduationCap, TrendingUp, PlusCircle } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [enrollments, setEnrollments] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignmentFilter, setAssignmentFilter] = useState('all'); // all, pending, submitted, overdue

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user?.role === 'student') {
          const [enrRes, allRes, assignRes] = await Promise.all([
            api.get('/enrollments/my'),
            api.get('/courses'),
            api.get('/assignments/my')
          ]);
          setEnrollments(enrRes.data);
          setAllCourses(allRes.data);
          setMyAssignments(assignRes.data || []);
        } else {
          const res = await api.get('/courses');
          const mine = res.data.filter(c => c.lecturer_id === user.id);
          setAllCourses(mine);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    if (user) fetchData();
  }, [user]);

  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div>
      {/* Welcome Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 60%, #06B6D4 100%)',
        borderRadius: 'var(--radius)',
        padding: '2rem 2.5rem',
        color: '#fff',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 6 }}>
            Hello, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p style={{ opacity: 0.85, fontSize: '1rem' }}>
            {user?.role === 'student' ? 'Ready to continue learning today?' : 'Manage your courses and inspire students.'}
          </p>
        </div>
        <Link to="/courses" className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)', padding: '0.65rem 1.4rem' }}>
          {user?.role === 'student' ? 'Browse Courses' : '+ New Course'}
        </Link>
      </div>

      {/* Stats */}
      {user?.role === 'student' && (
        <div className="stats-grid">
          <div className="stat-card indigo">
            <div className="stat-label">Enrolled</div>
            <div className="stat-value">{enrollments.length}</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-label">Available Courses</div>
            <div className="stat-value">{allCourses.length}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Completed</div>
            <div className="stat-value">0</div>
          </div>
        </div>
      )}
      {user?.role === 'lecturer' && (
        <div className="stats-grid">
          <div className="stat-card indigo">
            <div className="stat-label">Khóa học của tôi</div>
            <div className="stat-value">{allCourses.length}</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-label">Tổng bài giảng</div>
            <div className="stat-value">{allCourses.reduce((s, c) => s + (c.lesson_count || 0), 0)}</div>
          </div>
          <div className="stat-card cyan">
            <div className="stat-label">Học viên đăng ký</div>
            <div className="stat-value">{allCourses.reduce((s, c) => s + (c.student_count || 0), 0)}</div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="loading-wrapper"><div className="spinner"></div><p>Đang tải...</p></div>
      ) : (
        <>
          {user?.role === 'student' && (
            <div>
              <div className="page-header">
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Khóa học của tôi</h2>
                  <p className="page-subtitle">Tiếp tục học từ lần trước</p>
                </div>
              </div>
              {enrollments.length === 0 ? (
                <div className="empty-state card" style={{ padding: '3rem' }}>
                  <div className="empty-state-icon">📚</div>
                  <h3>Chưa có khóa học nào</h3>
                  <p>Bạn chưa đăng ký khóa học nào. Hãy bắt đầu học ngay hôm nay!</p>
                  <Link to="/courses" className="btn btn-primary" style={{ marginTop: '1rem' }}>Khám phá khóa học</Link>
                </div>
              ) : (
                <div className="grid-cards">
                  {enrollments.map(course => (
                    <div key={course.id} className="course-card">
                      <div className="course-card-thumb">
                        {course.thumbnail_url
                          ? <img src={assetUrl(course.thumbnail_url)} alt={course.title} />
                          : <GraduationCap size={48} />
                        }
                      </div>
                      <div className="course-card-body">
                        <div className="course-card-title">{course.title}</div>
                        <div className="course-card-desc">{course.description?.substring(0, 90)}{course.description?.length > 90 && '...'}</div>
                        <Link to={`/courses/${course.id}`} className="btn btn-primary btn-sm btn-block">Tiếp tục học →</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ASSIGNMENTS SECTION */}
              <div className="page-header" style={{ marginTop: '3rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Bài tập & Quiz</h2>
                  <p className="page-subtitle">Danh sách các bài tập cần hoàn thành</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className={`btn btn-sm ${assignmentFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAssignmentFilter('all')}>Tất cả</button>
                  <button className={`btn btn-sm ${assignmentFilter === 'pending' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAssignmentFilter('pending')}>Chưa làm</button>
                  <button className={`btn btn-sm ${assignmentFilter === 'submitted' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAssignmentFilter('submitted')}>Đã nộp</button>
                  <button className={`btn btn-sm ${assignmentFilter === 'overdue' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAssignmentFilter('overdue')}>Quá hạn</button>
                </div>
              </div>

              {myAssignments.length === 0 ? (
                <div className="empty-state card" style={{ padding: '2rem' }}>
                  <div className="empty-state-icon">📋</div>
                  <h3>Không có bài tập nào</h3>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {myAssignments.filter(a => {
                    const isOverdue = a.due_date && new Date() > new Date(a.due_date);
                    const isSubmitted = a.submission_count > 0;
                    if (assignmentFilter === 'pending') return !isSubmitted && !isOverdue;
                    if (assignmentFilter === 'submitted') return isSubmitted;
                    if (assignmentFilter === 'overdue') return isOverdue && !isSubmitted;
                    return true;
                  }).map(a => {
                    const isOverdue = a.due_date && new Date() > new Date(a.due_date);
                    return (
                      <div key={a.id} className="card" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                            <Link to={`/assignments/${a.id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>{a.title}</Link>
                            <span className={`badge ${a.type === 'quiz' ? 'badge-primary' : 'badge-warning'}`} style={{ marginLeft: '0.5rem' }}>{a.type}</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Khóa học: {a.course_title} • Điểm: {a.total_points}
                            {a.due_date && <span> • Hạn: <strong style={{ color: isOverdue ? 'var(--danger)' : 'inherit' }}>{new Date(a.due_date).toLocaleString('vi-VN')}</strong></span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {a.submission_count > 0 ? (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 600, color: a.best_score !== null ? 'var(--success)' : 'var(--warning)' }}>
                                {a.best_score !== null ? `${a.best_score}/${a.total_points} điểm` : 'Đang chấm...'}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đã nộp</div>
                            </div>
                          ) : isOverdue ? (
                            <span className="badge badge-error">Quá hạn</span>
                          ) : (
                            <span className="badge badge-ghost">Chưa làm</span>
                          )}
                          <Link to={`/assignments/${a.id}`} className="btn btn-secondary btn-sm">Xem chi tiết</Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {user?.role === 'lecturer' && (
            <div>
              <div className="page-header">
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Khóa học của tôi</h2>
                  <p className="page-subtitle">Quản lý các khóa học đang giảng dạy</p>
                </div>
                <Link to="/courses" className="btn btn-primary"><PlusCircle size={16} /> Tạo khóa học</Link>
              </div>
              {allCourses.length === 0 ? (
                <div className="empty-state card" style={{ padding: '3rem' }}>
                  <div className="empty-state-icon">🎓</div>
                  <h3>Chưa có khóa học nào</h3>
                  <p>Hãy tạo khóa học đầu tiên và truyền cảm hứng cho học viên!</p>
                  <Link to="/courses" className="btn btn-primary" style={{ marginTop: '1rem' }}>+ Tạo khóa học</Link>
                </div>
              ) : (
                <div className="grid-cards">
                  {allCourses.map(course => (
                    <div key={course.id} className="course-card">
                      <div className="course-card-thumb">
                        {course.thumbnail_url
                          ? <img src={assetUrl(course.thumbnail_url)} alt={course.title} />
                          : <BookOpen size={48} />
                        }
                      </div>
                      <div className="course-card-body">
                        <div className="course-card-title">{course.title}</div>
                        <div className="course-card-meta">
                          <span className="course-card-meta-item"><TrendingUp size={13} /> {course.lesson_count || 0} bài</span>
                          <span className="course-card-meta-item">👥 {course.student_count || 0} học viên</span>
                        </div>
                        <Link to={`/courses/${course.id}`} className="btn btn-secondary btn-sm btn-block">Quản lý khóa học</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;

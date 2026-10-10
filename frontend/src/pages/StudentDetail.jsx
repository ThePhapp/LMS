import React, { useCallback, useEffect, useState, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { assetUrl } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { ArrowLeft, CheckCircle2, Circle, Award, FileText, Calendar, TrendingUp, Eye } from 'lucide-react';

const StudentDetail = () => {
  const { courseId, studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStudentProgress = useCallback(async () => {
    try {
      const res = await api.get(`/enrollments/course/${courseId}/student/${studentId}`);
      setData(res.data);
    } catch (err) {
      console.error('Error fetching student progress:', err);
      alert(err.response?.data?.message || 'Lỗi tải dữ liệu');
      navigate(`/instructor/course/${courseId}/students`);
    } finally {
      setLoading(false);
    }
  }, [courseId, navigate, studentId]);

  useEffect(() => {
    if (user && user.role !== 'lecturer' && user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchStudentProgress();
  }, [fetchStudentProgress, navigate, user]);

  if (loading) return <div className="loading-wrapper"><div className="spinner" /><p>Đang tải...</p></div>;
  if (!data) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Chưa hoàn thành';
    return new Date(dateStr).toLocaleDateString('vi-VN', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const avatarUrl = data.student.avatar_url ? assetUrl(data.student.avatar_url) : null;
  const initial = data.student.name.charAt(0).toUpperCase();

  // Group lessons by chapter
  const lessonsGrouped = {};
  data.lessons.forEach(lesson => {
    const chapterKey = lesson.chapter_title || 'Uncategorized';
    if (!lessonsGrouped[chapterKey]) {
      lessonsGrouped[chapterKey] = [];
    }
    lessonsGrouped[chapterKey].push(lesson);
  });

  return (
    <div className="main-content">
      <button 
        className="btn btn-ghost btn-sm" 
        style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }} 
        onClick={() => navigate(`/instructor/course/${courseId}/students`)}
      >
        <ArrowLeft size={16} /> Quay lại Danh sách học viên
      </button>

      {/* Header */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', fontWeight: 800, color: '#fff',
            overflow: 'hidden', boxShadow: 'var(--shadow-md)', flexShrink: 0
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : initial}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              {data.student.name}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{data.student.email}</p>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Khóa học: <strong style={{ color: 'var(--text)' }}>{data.course.title}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: 50, height: 50, borderRadius: '12px', 
              background: 'var(--primary-light)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                {data.progress.progress_percentage}%
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tiến độ</div>
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
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                {data.progress.completed_lessons}/{data.progress.total_lessons}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bài học</div>
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
              <Award size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                {data.assignments.filter(a => a.status === 'graded').length}/{data.assignments.length}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bài tập đã chấm</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Tổng quan tiến độ học tập
        </div>
        <div style={{ 
          width: '100%', height: '16px', 
          background: 'var(--surface-2)', borderRadius: '99px', overflow: 'hidden' 
        }}>
          <div style={{ 
            width: `${data.progress.progress_percentage}%`, height: '100%', 
            background: 'linear-gradient(90deg, var(--primary), var(--accent))',
            borderRadius: '99px', transition: 'width 0.5s'
          }} />
        </div>
      </div>

      {/* Lessons Progress */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Chi tiết bài học</h3>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {Object.entries(lessonsGrouped).map(([chapterTitle, lessons]) => (
            <div key={chapterTitle} style={{ marginBottom: '2rem' }}>
              <h4 style={{ 
                fontSize: '1rem', fontWeight: 700, marginBottom: '1rem',
                paddingBottom: '0.5rem', borderBottom: '2px solid var(--border)'
              }}>
                {chapterTitle}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {lessons.map(lesson => (
                  <div 
                    key={lesson.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '1rem',
                      padding: '1rem', borderRadius: 'var(--radius)',
                      background: lesson.completed ? 'var(--success-light)' : 'var(--surface-2)',
                      border: `1px solid ${lesson.completed ? 'var(--success)' : 'var(--border)'}`
                    }}
                  >
                    {lesson.completed ? (
                      <CheckCircle2 size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    ) : (
                      <Circle size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{lesson.title}</div>
                      {lesson.duration && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Thời lượng: {lesson.duration}
                        </div>
                      )}
                    </div>
                    {lesson.completed && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        {formatDate(lesson.completed_at)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assignments */}
      {data.assignments.length > 0 && (
        <div className="card">
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Bài tập & Điểm số</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Bài tập</th>
                  <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Điểm tối đa</th>
                  <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Điểm đạt được</th>
                  <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Trạng thái</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Nộp bài</th>
                  <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Xem tất cả</th>
                </tr>
              </thead>
              <tbody>
                {data.assignments.map(assignment => (
                  <tr key={assignment.assignment_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} style={{ color: 'var(--text-muted)' }} />
                        {assignment.title}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                      {assignment.total_points}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {assignment.score !== null ? (
                        <span style={{ 
                          fontSize: '1.1rem', fontWeight: 700,
                          color: assignment.score >= assignment.total_points * 0.7 ? 'var(--success)' : 'var(--warning)'
                        }}>
                          {assignment.score}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {assignment.status === 'graded' ? (
                        <span className="badge badge-success">Đã chấm</span>
                      ) : assignment.status === 'submitted' ? (
                        <span className="badge badge-warning">Chờ chấm</span>
                      ) : (
                        <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                          Chưa nộp
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={14} />
                        {assignment.submitted_at ? formatDate(assignment.submitted_at) : 'Chưa nộp'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <Link
                        to={`/instructor/assignment/${assignment.assignment_id}/grading`}
                        className="btn btn-sm btn-ghost"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <Eye size={14} /> Xem tất cả
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetail;

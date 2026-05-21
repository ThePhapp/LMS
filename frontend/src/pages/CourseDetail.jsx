import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { assetUrl } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { PlayCircle, FileText, FileVideo, CheckCircle2, Users, BookOpen, GraduationCap, Star, ArrowLeft, Clock } from 'lucide-react';

function getYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?/\s]{11})/);
  return match ? match[1] : null;
}

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    fetchCourse();
    if (user?.role === 'student') checkEnrollment();
  }, [id, user]);

  const fetchCourse = async () => {
    try {
      const res = await api.get(`/courses/${id}`);
      setCourse(res.data);
    } catch { 
      navigate('/courses'); 
    } finally { 
      setLoading(false); 
    }
  };

  const checkEnrollment = async () => {
    try {
      const res = await api.get('/enrollments/my');
      setIsEnrolled(res.data.some(c => c.id === parseInt(id)));
    } catch { }
  };

  const handleEnroll = async () => {
    if (!user) return navigate('/login');
    try {
      await api.post('/enrollments', { course_id: id });
      setIsEnrolled(true);
      navigate(`/courses/${id}/learn`);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi đăng ký');
    }
  };

  if (loading) return <div className="loading-wrapper"><div className="spinner" /><p>Đang tải khóa học...</p></div>;
  if (!course) return null;

  const isOwner = user?.role === 'lecturer' && user?.id === course.lecturer_id;
  const lessons = course.lessons || [];
  const firstVideoLesson = lessons.find(l => l.video_url || l.file_type === 'video');
  const ytId = firstVideoLesson ? getYoutubeId(firstVideoLesson.video_url) : null;
  
  // Calculate total duration roughly (mock logic, assume strings like '15 min')
  const totalMins = lessons.reduce((acc, l) => acc + (parseInt(l.duration) || 10), 0);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  return (
    <div className="main-content">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }} onClick={() => navigate('/courses')}>
        <ArrowLeft size={16} /> Quay lại danh sách
      </button>

      {/* Hero Banner */}
      <div className="course-detail-banner" style={{
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        color: '#fff',
        padding: '3rem 2rem',
        borderRadius: 'var(--radius)',
        marginBottom: '2rem'
      }}>
        <div style={{ maxWidth: '800px' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>{course.category || 'Chung'}</span>
            <span className="badge badge-warning">{{ Beginner: 'Cơ bản', Intermediate: 'Trung cấp', Advanced: 'Nâng cao' }[course.level] || course.level || 'Cơ bản'}</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.2 }}>{course.title}</h1>
          <p style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '1.5rem', lineHeight: 1.6 }}>{course.description}</p>
          
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.9rem', color: '#94a3b8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={16} fill="#eab308" color="#eab308" />
              <strong style={{ color: '#fff' }}>{course.rating ? parseFloat(course.rating).toFixed(1) : '4.0'}</strong> 
              ({course.rating_count || 0} đánh giá)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={16} /> {course.student_count || 0} Học viên</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><GraduationCap size={16} /> {course.lecturer_name}</div>
          </div>
        </div>
      </div>

      {/* Main Layout (2 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }} className="course-detail-grid">
        
        {/* Left Column (70%) */}
        <div className="course-detail-left">
          <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem' }}>Mô tả khóa học</h3>
            <div style={{ lineHeight: 1.8, color: 'var(--text)', fontSize: '1rem', whiteSpace: 'pre-wrap' }}>
              {course.description}
              <br/><br/>
              Bạn sẽ học được:<br/>
              - Các kiến thức cốt lõi về {course.category}.<br/>
              - Hoàn thành {lessons.length} bài tập thực hành.<br/>
              - Tích lũy điểm số và nhận chứng chỉ hoàn thành.
            </div>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Nội dung khóa học (Curriculum)</h3>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{course.chapters?.length || 0} chương • {lessons.length} bài học</span>
            </div>
            
            <div className="curriculum-list">
              {course.chapters && course.chapters.length > 0 ? (
                course.chapters.map((chapter, idx) => (
                  <div key={chapter.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--surface-2)', padding: '1rem 1.25rem', fontWeight: 700, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Chương {idx + 1}: {chapter.title}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{chapter.lessons?.length || 0} bài</span>
                    </div>
                    <div style={{ padding: '0.5rem 0' }}>
                      {chapter.lessons?.map((lesson, lIdx) => (
                        <div key={lesson.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.25rem' }}>
                          {lesson.video_url || lesson.file_type === 'video' ? <PlayCircle size={16} color="var(--primary)" /> : <FileText size={16} color="var(--warning)" />}
                          <span style={{ flex: 1, fontSize: '0.95rem' }}>Trình bày {lesson.title}</span>
                          {lesson.duration && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lesson.duration}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Chưa có nội dung bài học.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (30%) - Sticky Widget */}
        <div className="course-detail-right" style={{ position: 'sticky', top: '90px' }}>
          <div className="card" style={{ overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
            
            {/* Video preview or image */}
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', position: 'relative' }}>
              {ytId ? (
                <iframe src={`https://www.youtube.com/embed/${ytId}`} allowFullScreen style={{ width: '100%', height: '100%', border: 'none' }} />
              ) : (
                course.thumbnail_url 
                  ? <img src={assetUrl(course.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: '-webkit-optimize-contrast' }} alt={course.title} /> 
                  : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.5)' }}><PlayCircle size={48} /></div>
              )}
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1.5rem' }}>
                {course.price > 0 ? `$${parseFloat(course.price).toFixed(2)}` : 'Mở đăng ký'}
              </div>

              {isOwner ? (
                <>
                  <Link to={`/courses/${id}/learn`} className="btn btn-primary btn-lg btn-block" style={{ marginBottom: '0.75rem' }}>
                    Xem bài học
                  </Link>
                  <Link to={`/instructor/course/${id}/edit`} className="btn btn-secondary btn-lg btn-block" style={{ marginBottom: '1rem' }}>
                    Chỉnh sửa khóa học
                  </Link>
                </>
              ) : isEnrolled ? (
                <Link to={`/courses/${id}/learn`} className="btn btn-primary btn-lg btn-block" style={{ marginBottom: '1rem' }}>
                  Tiếp tục học (Continue)
                </Link>
              ) : (
                <button className="btn btn-primary btn-lg btn-block" style={{ marginBottom: '1rem' }} onClick={handleEnroll}>
                  Đăng ký ngay (Enroll)
                </button>
              )}

              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>Khóa học này bao gồm:</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text)' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><PlayCircle size={16} color="var(--primary)" /> {hours} giờ {mins} phút nội dung video</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FileVideo size={16} color="var(--primary)" /> Truy cập trên di động và màn hình lớn</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><CheckCircle2 size={16} color="var(--primary)" /> Hoàn thành theo tiến độ cá nhân</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><GraduationCap size={16} color="var(--primary)" /> Chứng chỉ hoàn thành</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CourseDetail;

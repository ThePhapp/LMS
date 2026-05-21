import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { assetUrl } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { PlayCircle, FileText, FileVideo, CheckCircle2, Users, BookOpen, GraduationCap, Star, ArrowLeft, Clock, Award, Target, Layers } from 'lucide-react';

function getYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?/\s]{11})/);
  return match ? match[1] : null;
}

const LEVEL_MAP = { Beginner: 'Cơ bản', Intermediate: 'Trung cấp', Advanced: 'Nâng cao', Semester1: 'Học kỳ 1', Semester2: 'Học kỳ 2' };

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
  
  const totalMins = lessons.reduce((acc, l) => acc + (parseInt(l.duration) || 10), 0);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  const objectives = [
    `Nắm vững kiến thức cốt lõi về ${course.category || 'môn học'}`,
    `Hoàn thành ${lessons.length} bài học thực hành`,
    'Tích lũy điểm số và theo dõi tiến độ cá nhân',
    'Nhận chứng chỉ hoàn thành khóa học',
  ];

  return (
    <div className="main-content">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem', color: 'var(--text-muted)' }} onClick={() => navigate('/courses')}>
        <ArrowLeft size={16} /> Quay lại danh sách
      </button>

      {/* Hero Banner with Background Image */}
      <div className="cd-hero">
        <div className="cd-hero-bg">
          {course.thumbnail_url 
            ? <img src={assetUrl(course.thumbnail_url)} alt="" />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1e293b 0%, #312e81 50%, #0f172a 100%)' }} />
          }
        </div>
        <div className="cd-hero-content">
          <div className="cd-hero-badges">
            <span className="badge" style={{ background: 'rgba(99,102,241,.7)', color: '#fff' }}>
              {course.category || 'Chung'}
            </span>
            <span className="badge" style={{ background: 'rgba(245,158,11,.75)', color: '#fff' }}>
              {LEVEL_MAP[course.level] || course.level || 'Cơ bản'}
            </span>
          </div>
          <h1>{course.title}</h1>
          <p className="cd-hero-desc">{course.description}</p>
          <div className="cd-hero-stats">
            <div className="cd-hero-stat">
              <Star size={16} fill="#eab308" color="#eab308" />
              <strong>{course.rating ? parseFloat(course.rating).toFixed(1) : '4.0'}</strong>
              ({course.rating_count || 0} đánh giá)
            </div>
            <div className="cd-hero-stat">
              <Users size={16} /> <strong>{course.student_count || 0}</strong> học viên
            </div>
            <div className="cd-hero-stat">
              <BookOpen size={16} /> <strong>{lessons.length}</strong> bài học
            </div>
            <div className="cd-hero-stat">
              <Clock size={16} /> {hours > 0 ? `${hours}h ${mins}m` : `${mins} phút`}
            </div>
            <div className="cd-hero-stat">
              <GraduationCap size={16} /> {course.lecturer_name}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="cd-grid">
        
        {/* Left Column */}
        <div>
          {/* Learning Objectives */}
          <div className="cd-section">
            <div className="cd-section-title">
              <div className="cd-section-title-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                <Target size={18} />
              </div>
              Bạn sẽ học được gì?
            </div>
            <div className="cd-objectives">
              {objectives.map((obj, i) => (
                <div key={i} className="cd-objective-item">
                  <CheckCircle2 size={18} color="var(--success)" />
                  <span>{obj}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Course Description */}
          <div className="cd-section">
            <div className="cd-section-title">
              <div className="cd-section-title-icon" style={{ background: '#EDE9FE', color: 'var(--secondary)' }}>
                <FileText size={18} />
              </div>
              Mô tả khóa học
            </div>
            <div style={{ lineHeight: 1.8, color: 'var(--text)', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
              {course.description}
            </div>
          </div>

          {/* Curriculum */}
          <div className="cd-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div className="cd-section-title" style={{ marginBottom: 0 }}>
                <div className="cd-section-title-icon" style={{ background: '#CFFAFE', color: 'var(--accent)' }}>
                  <Layers size={18} />
                </div>
                Nội dung khóa học
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {course.chapters?.length || 0} chương • {lessons.length} bài học
              </span>
            </div>
            
            <div>
              {course.chapters && course.chapters.length > 0 ? (
                course.chapters.map((chapter, idx) => (
                  <div key={chapter.id} className="cd-chapter">
                    <div className="cd-chapter-header">
                      <span>Chương {idx + 1}: {chapter.title}</span>
                      <span className="cd-chapter-count">{chapter.lessons?.length || 0} bài</span>
                    </div>
                    <div>
                      {chapter.lessons?.map((lesson, lIdx) => (
                        <div key={lesson.id} className="cd-lesson-row">
                          <div className="cd-lesson-num">{lIdx + 1}</div>
                          {lesson.video_url || lesson.file_type === 'video' 
                            ? <PlayCircle size={16} color="var(--primary)" /> 
                            : <FileText size={16} color="var(--warning)" />
                          }
                          <span style={{ flex: 1, fontSize: '0.92rem', fontWeight: 500 }}>{lesson.title}</span>
                          {lesson.duration && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> {lesson.duration}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <BookOpen size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                  <p>Chưa có nội dung bài học.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sticky Sidebar Widget */}
        <div>
          <div className="cd-sidebar-widget">
            {/* Preview */}
            <div className="cd-sidebar-preview">
              {ytId ? (
                <iframe src={`https://www.youtube.com/embed/${ytId}`} allowFullScreen style={{ width: '100%', height: '100%', border: 'none' }} />
              ) : (
                course.thumbnail_url 
                  ? <img src={assetUrl(course.thumbnail_url)} alt={course.title} />
                  : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)' }}>
                      <PlayCircle size={48} />
                    </div>
              )}
            </div>

            <div className="cd-sidebar-body">
              {/* Price */}
              <div className="cd-price">
                {course.price > 0 
                  ? <span style={{ color: 'var(--primary)' }}>{parseFloat(course.price).toLocaleString()}đ</span>
                  : <span style={{ background: 'linear-gradient(135deg, #10B981, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Mở đăng ký</span>
                }
              </div>

              {/* Action Buttons */}
              {isOwner || user?.role === 'admin' || user?.role === 'lecturer' ? (
                <>
                  <Link to={`/courses/${id}/learn`} className="btn btn-primary btn-lg btn-block" style={{ marginBottom: '0.75rem', borderRadius: '12px' }}>
                    <BookOpen size={18} /> Xem bài học
                  </Link>
                  {(isOwner || user?.role === 'admin') && (
                    <Link to={`/instructor/course/${id}/edit`} className="btn btn-secondary btn-lg btn-block" style={{ marginBottom: '0.5rem', borderRadius: '12px' }}>
                      Chỉnh sửa khóa học
                    </Link>
                  )}
                </>
              ) : isEnrolled ? (
                <Link to={`/courses/${id}/learn`} className="btn btn-primary btn-lg btn-block" style={{ borderRadius: '12px' }}>
                  <BookOpen size={18} /> Tiếp tục học
                </Link>
              ) : (
                <button className="btn btn-primary btn-lg btn-block" style={{ borderRadius: '12px' }} onClick={handleEnroll}>
                  <GraduationCap size={18} /> Đăng ký ngay
                </button>
              )}

              {/* Includes */}
              <div className="cd-includes">
                <h4>Khóa học bao gồm</h4>
                <div className="cd-include-item">
                  <div className="cd-include-icon"><PlayCircle size={16} color="var(--primary)" /></div>
                  {hours > 0 ? `${hours} giờ ${mins} phút` : `${mins} phút`} nội dung video
                </div>
                <div className="cd-include-item">
                  <div className="cd-include-icon"><FileText size={16} color="var(--primary)" /></div>
                  {lessons.length} bài học lý thuyết & thực hành
                </div>
                <div className="cd-include-item">
                  <div className="cd-include-icon"><FileVideo size={16} color="var(--primary)" /></div>
                  Truy cập trên mọi thiết bị
                </div>
                <div className="cd-include-item">
                  <div className="cd-include-icon"><CheckCircle2 size={16} color="var(--primary)" /></div>
                  Theo dõi tiến độ cá nhân
                </div>
                <div className="cd-include-item">
                  <div className="cd-include-icon"><Award size={16} color="var(--primary)" /></div>
                  Chứng chỉ hoàn thành
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CourseDetail;

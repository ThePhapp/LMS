import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { assetUrl } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { Search, BookOpen, Users, GraduationCap, Star, Filter } from 'lucide-react';
import { EmptyState, ErrorState, PageLoadingState } from '../components/ui/Feedback';

const CATEGORIES = ['Tất cả', 'Toán', 'Tiếng Việt', 'Tiếng Anh', 'Đạo đức', 'Tự nhiên và Xã hội', 'Khoa học', 'Lịch sử và địa lý', 'Âm nhạc', 'Mỹ thuật'];
const CATEGORIES_VAL = ['All', 'Math', 'Vietnamese', 'English', 'Ethics', 'Nature', 'Science', 'HistoryGeography', 'Music', 'Arts'];
const LEVELS = ['Tất cả', 'Học kỳ 1', 'Học kỳ 2'];
const LEVELS_VAL = ['All', 'Semester1', 'Semester2'];
const LEVEL_LABELS = { Semester1: 'Học kỳ 1', Semester2: 'Học kỳ 2' };

const CourseList = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All');
  const [priceFilter, setPriceFilter] = useState('all'); // 'all', 'free', 'paid'
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/courses', { params: { search, category, level, priceFilter } })
      .then((res) => {
        if (!cancelled) {
          setCourses(res.data);
          setError('');
        }
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.response?.data?.message || 'Không thể tải danh sách khóa học.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [category, level, priceFilter, search]);

  const handleEnrollOrView = (courseId) => {
    navigate(`/courses/${courseId}`);
  };

  return (
    <div className="main-content">
      {/* Header */}
      <div className="page-header catalog-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Khóa học</h1>
          <p className="page-subtitle">Tìm kiếm và chọn lựa các khóa học phù hợp với bạn</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%', maxWidth: '400px' }}>
          <div className="search-bar" style={{ flex: 1, maxWidth: 'none' }}>
            <span className="search-bar-icon"><Search size={15} /></span>
            <input
              aria-label="Tìm kiếm khóa học"
              placeholder="Tìm kiếm khóa học..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <button className="btn btn-secondary d-md-none" aria-expanded={showSidebarMobile} onClick={() => setShowSidebarMobile(!showSidebarMobile)}>
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="course-list-layout">
        {/* Sidebar Filters */}
        <aside className={`course-sidebar ${showSidebarMobile ? 'show' : ''}`} aria-label="Bộ lọc khóa học">
          <div className="card course-filter-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Bộ lọc</h3>
            
            {/* Category Filter */}
            <div className="filter-group" style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Môn học</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {CATEGORIES.map((label, i) => (
                  <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="radio" name="category" checked={category === CATEGORIES_VAL[i]} onChange={() => setCategory(CATEGORIES_VAL[i])} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Level Filter */}
            <div className="filter-group" style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Học kỳ</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {LEVELS.map((label, i) => (
                  <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="radio" name="level" checked={level === LEVELS_VAL[i]} onChange={() => setLevel(LEVELS_VAL[i])} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="filter-group">
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Giá</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="radio" name="price" checked={priceFilter === 'all'} onChange={() => setPriceFilter('all')} />
                  Tất cả
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="radio" name="price" checked={priceFilter === 'free'} onChange={() => setPriceFilter('free')} />
                  Mở đăng ký
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="radio" name="price" checked={priceFilter === 'paid'} onChange={() => setPriceFilter('paid')} />
                  Có phí
                </label>
              </div>
            </div>
            
          </div>
        </aside>

        {/* Main Content: Courses Grid */}
        <main className="course-main">
          {loading ? (
            <PageLoadingState label="Đang tải khóa học" />
          ) : error ? (
            <ErrorState title="Không thể tải khóa học" detail={error} onRetry={() => window.location.reload()} />
          ) : courses.length === 0 ? (
            <EmptyState page action={<button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setCategory('All'); setLevel('All'); setPriceFilter('all'); }}>Xóa bộ lọc</button>}>
              <div className="empty-state-icon">🔍</div>
              <h3>Không tìm thấy khóa học</h3>
              <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
            </EmptyState>
          ) : (
            <div className="grid-cards catalog-grid">
              {courses.map(course => (
                <div key={course.id} className="course-card" onClick={() => handleEnrollOrView(course.id)}>
                  <div className="course-card-thumb" style={{ height: '200px' }}>
                    {course.thumbnail_url
                      ? <img 
                          src={assetUrl(course.thumbnail_url)} 
                          alt={course.title}
                          loading="lazy"
                          style={{ objectPosition: 'center center' }}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      : <GraduationCap size={48} strokeWidth={1.5} />
                    }
                    <span className="badge badge-primary" style={{ position: 'absolute', top: 12, left: 12 }}>{course.category}</span>
                    <span className="badge badge-purple" style={{ position: 'absolute', top: 12, right: 12 }}>{LEVEL_LABELS[course.level] || course.level || 'Cơ bản'}</span>
                  </div>
                  <div className="course-card-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                    <div className="course-card-title" style={{ fontSize: '1.05rem', minHeight: '48px', marginBottom: '6px' }}>
                      {course.title}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ 
                        width: '24px', height: '24px', borderRadius: '50%', 
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0
                      }}>
                        {(course.lecturer_name || 'T').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{course.lecturer_name}</span>
                    </div>
                    
                    {/* Rating & Lessons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={14} 
                            fill={i < Math.round(parseFloat(course.rating || 4)) ? '#eab308' : 'none'} 
                            color={i < Math.round(parseFloat(course.rating || 4)) ? '#eab308' : '#d4d4d8'} 
                            strokeWidth={1.5}
                          />
                        ))}
                        <span style={{ fontWeight: 600, color: 'var(--text)', marginLeft: '4px' }}>{course.rating ? parseFloat(course.rating).toFixed(1) : '4.0'}</span>
                        <span style={{ color: 'var(--text-light)' }}>({course.rating_count || 0})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        <BookOpen size={14} />
                        {course.lesson_count || 0} bài
                      </div>
                    </div>
                    
                    {/* Price & Action */}
                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>
                        {course.price > 0 
                          ? <span style={{ color: 'var(--primary)' }}>{parseFloat(course.price).toLocaleString()}đ</span>
                          : <span style={{ 
                              background: 'linear-gradient(135deg, #10B981, #06B6D4)', 
                              WebkitBackgroundClip: 'text', 
                              WebkitTextFillColor: 'transparent'
                            }}>Mở đăng ký</span>
                        }
                      </div>
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={(e) => { e.stopPropagation(); handleEnrollOrView(course.id); }}
                        style={{ borderRadius: '9999px', padding: '0.4rem 1.2rem' }}
                      >
                        Đăng ký
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CourseList;

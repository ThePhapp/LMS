import React, { useEffect, useState, useContext } from 'react';
import api from '../services/api';
import { assetUrl } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Search, BookOpen, Users, GraduationCap, Star, Filter } from 'lucide-react';

const CATEGORIES = ['Tất cả', 'Toán', 'Tiếng Việt', 'Tiếng Anh', 'Đạo đức', 'Tự nhiên và Xã hội', 'Âm nhạc', 'Mỹ thuật', 'Thể dục'];
const CATEGORIES_VAL = ['All', 'Math', 'Vietnamese', 'English', 'Ethics', 'Nature', 'Music', 'Arts', 'PE'];
const LEVELS = ['Tất cả', 'Học kỳ 1', 'Học kỳ 2'];
const LEVELS_VAL = ['All', 'Semester1', 'Semester2'];
const LEVEL_LABELS = { Semester1: 'Học kỳ 1', Semester2: 'Học kỳ 2' };

const CourseList = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All');
  const [priceFilter, setPriceFilter] = useState('all'); // 'all', 'free', 'paid'
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, [search, category, level, priceFilter]);

  const fetchCourses = () => {
    setLoading(true);
    api.get('/courses', { params: { search, category, level, priceFilter } })
      .then(res => setCourses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleEnrollOrView = (courseId) => {
    navigate(`/courses/${courseId}`);
  };

  return (
    <div className="main-content">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Khóa học</h1>
          <p className="page-subtitle">Tìm kiếm và chọn lựa các khóa học phù hợp với bạn</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%', maxWidth: '400px' }}>
          <div className="search-bar" style={{ flex: 1, maxWidth: 'none' }}>
            <span className="search-bar-icon"><Search size={15} /></span>
            <input 
              placeholder="Tìm kiếm khóa học..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <button className="btn btn-secondary d-md-none" onClick={() => setShowSidebarMobile(!showSidebarMobile)} style={{ display: 'none' }}>
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="course-list-layout" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        {/* Sidebar Filters */}
        <aside className={`course-sidebar ${showSidebarMobile ? 'show' : ''}`} style={{ width: '280px', flexShrink: 0, position: 'sticky', top: '90px' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
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
                  Miễn phí
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
        <main className="course-main" style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div className="loading-wrapper"><div className="spinner"></div><p>Đang tải...</p></div>
          ) : courses.length === 0 ? (
            <div className="empty-state card" style={{ padding: '4rem' }}>
              <div className="empty-state-icon">🔍</div>
              <h3>Không tìm thấy khóa học</h3>
              <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
            </div>
          ) : (
            <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {courses.map(course => (
                <div key={course.id} className="course-card">
                  <div className="course-card-thumb" style={{ height: '140px' }}>
                    {course.thumbnail_url
                      ? <img src={assetUrl(course.thumbnail_url)} alt={course.title} />
                      : <GraduationCap size={40} />
                    }
                    <span className="badge badge-primary" style={{ position: 'absolute', top: 10, left: 10 }}>{course.category}</span>
                    <span className="badge badge-purple" style={{ position: 'absolute', top: 10, right: 10 }}>{LEVEL_LABELS[course.level] || course.level || 'Cơ bản'}</span>
                  </div>
                  <div className="course-card-body" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                    <div className="course-card-title" style={{ fontSize: '1.05rem', minHeight: '44px', marginBottom: '4px' }}>
                      {course.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <GraduationCap size={13} /> {course.lecturer_name}
                    </div>
                    
                    {/* Rating & Lessons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#eab308' }}>
                        <Star size={14} fill="currentColor" />
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{course.rating ? parseFloat(course.rating).toFixed(1) : '4.0'}</span>
                        <span style={{ color: 'var(--text-light)' }}>({course.rating_count || 0})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                        <BookOpen size={13} />
                        {course.lesson_count || 0} bài
                      </div>
                    </div>
                    
                    {/* Price & Action */}
                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
                        {course.price > 0 ? `$${parseFloat(course.price).toFixed(2)}` : 'Miễn phí'}
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => handleEnrollOrView(course.id)}>
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

import React, { useEffect, useMemo, useState } from 'react';
import { Filter, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { CourseCard, PageHeader, SearchField } from '../components/ui/AppUI';
import { formatCurrency } from '../components/ui/utils';
import { EmptyState, ErrorState, PageLoadingState } from '../components/ui/Feedback';

const CATEGORY_OPTIONS = [
  ['All', 'Tất cả'],
  ['Math', 'Toán'],
  ['Vietnamese', 'Tiếng Việt'],
  ['English', 'Tiếng Anh'],
  ['Ethics', 'Đạo đức'],
  ['Nature', 'Tự nhiên và Xã hội'],
  ['Science', 'Khoa học'],
  ['HistoryGeography', 'Lịch sử và địa lý'],
  ['Music', 'Âm nhạc'],
  ['Arts', 'Mỹ thuật'],
];
const LEVEL_OPTIONS = [['All', 'Tất cả'], ['Semester1', 'Học kỳ 1'], ['Semester2', 'Học kỳ 2']];
const PRICE_OPTIONS = [['all', 'Tất cả'], ['free', 'Mở đăng ký'], ['paid', 'Có phí']];
const CATEGORY_LABELS = Object.fromEntries(CATEGORY_OPTIONS);

function FilterGroup({ title, value, options, onChange }) {
  return (
    <div className="catalog-filter-group">
      <h3>{title}</h3>
      <div className="catalog-filter-options">
        {options.map(([optionValue, label]) => (
          <button
            key={optionValue}
            type="button"
            className={value === optionValue ? 'active' : ''}
            aria-pressed={value === optionValue}
            onClick={() => onChange(optionValue)}
          >
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CourseList() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All');
  const [priceFilter, setPriceFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadCourses = async () => {
      setLoading(true);
      try {
        const response = await api.get('/courses', { params: { search, category, level, priceFilter } });
        if (!cancelled) {
          setCourses(response.data || []);
          setError('');
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.response?.data?.message || 'Không thể tải danh sách khóa học.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadCourses();
    return () => { cancelled = true; };
  }, [category, level, priceFilter, search]);

  const hasFilters = search || category !== 'All' || level !== 'All' || priceFilter !== 'all';
  const filterCount = [category !== 'All', level !== 'All', priceFilter !== 'all'].filter(Boolean).length;
  const decoratedCourses = useMemo(() => courses.map((course) => ({
    ...course,
    category: CATEGORY_LABELS[course.category] || course.category,
  })), [courses]);

  const clearFilters = () => {
    setSearch('');
    setCategory('All');
    setLevel('All');
    setPriceFilter('all');
  };

  return (
    <div className="app-page catalog-page">
      <PageHeader
        eyebrow="Thư viện học tập"
        title="Khóa học"
        description="Tìm theo môn học, học kỳ và hình thức đăng ký."
      />

      <div className="catalog-toolbar">
        <SearchField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm tên khóa học hoặc giảng viên"
          label="Tìm kiếm khóa học"
        />
        <button type="button" className="btn btn-secondary catalog-filter-toggle" aria-expanded={showFilters} onClick={() => setShowFilters((current) => !current)}>
          <Filter size={16} aria-hidden="true" /><span className="catalog-filter-label">Bộ lọc</span>{filterCount > 0 && <span className="control-count">{filterCount}</span>}
        </button>
      </div>

      <div className="catalog-layout">
        <aside className={`catalog-filters ${showFilters ? 'open' : ''}`} aria-label="Bộ lọc khóa học">
          <div className="catalog-filter-heading">
            <div><SlidersHorizontal size={17} aria-hidden="true" /><h2>Bộ lọc</h2></div>
            {hasFilters && <button type="button" className="text-link" onClick={clearFilters}>Xóa lọc</button>}
          </div>
          <FilterGroup title="Môn học" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
          <FilterGroup title="Học kỳ" value={level} options={LEVEL_OPTIONS} onChange={setLevel} />
          <FilterGroup title="Giá" value={priceFilter} options={PRICE_OPTIONS} onChange={setPriceFilter} />
        </aside>

        <main className="catalog-results">
          <div className="catalog-results-header">
            <p><strong>{courses.length}</strong> khóa học</p>
            {hasFilters && <button type="button" className="text-link catalog-clear-mobile" onClick={clearFilters}>Xóa lọc</button>}
          </div>
          {loading ? (
            <PageLoadingState label="Đang tải khóa học" />
          ) : error ? (
            <ErrorState title="Không thể tải khóa học" detail={error} onRetry={() => window.location.reload()} />
          ) : decoratedCourses.length === 0 ? (
            <EmptyState action={hasFilters ? <button type="button" className="text-link" onClick={clearFilters}>Xóa lọc</button> : null}>
              <p>Không có khóa học nào khớp với lựa chọn hiện tại.</p>
            </EmptyState>
          ) : (
            <div className="course-grid catalog-grid">
              {decoratedCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  footer={(
                    <div className="course-tile-footer">
                      <strong>{formatCurrency(course.price)}</strong>
                      <Link className="btn btn-primary" to={`/courses/${course.id}`}>Xem khóa học</Link>
                    </div>
                  )}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

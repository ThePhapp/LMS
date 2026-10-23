import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Eye, FileText, RefreshCw, Tag, Trash2, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { assetUrl } from '../services/api';
import { EmptyState, ErrorState, PageLoadingState } from '../components/ui/Feedback';
import { MetricCard, PageHeader, SearchField, SelectMenu, StatusBadge } from '../components/ui/AppUI';

const LEVEL_OPTIONS = [
  { value: 'all', label: 'Tất cả cấp độ' },
  { value: 'Beginner', label: 'Cơ bản' },
  { value: 'Intermediate', label: 'Trung cấp' },
  { value: 'Advanced', label: 'Nâng cao' },
];

const LEVEL_LABELS = Object.fromEntries(LEVEL_OPTIONS.map((option) => [option.value, option.label]));

const CATEGORY_LABELS = {
  Science: 'Khoa học',
  Language: 'Ngôn ngữ',
  English: 'Tiếng Anh',
  Vietnamese: 'Tiếng Việt',
  Arts: 'Nghệ thuật',
  Math: 'Toán',
  General: 'Tổng hợp',
};

const DeleteModal = ({ course, onConfirm, onCancel, loading }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, onCancel]);

  return (
  <div className="modal-overlay" role="presentation" onClick={onCancel}>
    <div className="modal app-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-course-title" onClick={(event) => event.stopPropagation()}>
      <div className="modal-header">
        <div className="confirm-heading">
          <span className="confirm-icon confirm-icon-danger"><AlertTriangle size={20} aria-hidden="true" /></span>
          <div>
            <h2 className="modal-title" id="delete-course-title">Xóa khóa học</h2>
            <p>Hành động này không thể hoàn tác.</p>
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} aria-label="Đóng hộp thoại"><X size={18} aria-hidden="true" /></button>
      </div>
      <div className="modal-body"><p className="confirm-copy">Bạn có chắc muốn xóa <strong>“{course?.title}”</strong>? Tất cả bài học, chương và dữ liệu liên quan sẽ bị xóa vĩnh viễn.</p></div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Hủy</button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={loading}><Trash2 size={15} aria-hidden="true" />{loading ? 'Đang xóa...' : 'Xóa khóa học'}</button>
      </div>
    </div>
  </div>
  );
};

const CourseThumbnail = ({ course }) => (
  <span className="admin-course-thumbnail">
    {course.thumbnail_url ? <img src={assetUrl(course.thumbnail_url)} alt="" loading="lazy" /> : <BookOpen size={18} aria-hidden="true" />}
  </span>
);

const AdminCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/courses');
      setCourses(response.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách khóa học.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const categoryOptions = useMemo(() => [
    { value: 'all', label: 'Tất cả danh mục' },
    ...Array.from(new Set(courses.map((course) => course.category).filter(Boolean))).map((category) => ({ value: category, label: CATEGORY_LABELS[category] || category })),
  ], [courses]);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
      const matchesLevel = levelFilter === 'all' || course.level === levelFilter;
      const matchesSearch = !query || [course.title, course.lecturer_name].some((value) => String(value || '').toLowerCase().includes(query));
      return matchesCategory && matchesLevel && matchesSearch;
    });
  }, [categoryFilter, courses, levelFilter, search]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/courses/${deleteTarget.id}`);
      setCourses((current) => current.filter((course) => course.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast(`Đã xóa khóa học “${deleteTarget.title}”.`);
    } catch (requestError) {
      showToast(requestError.response?.data?.message || 'Xóa thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const totalStudents = courses.reduce((sum, course) => sum + Number(course.student_count || 0), 0);

  return (
    <div className="admin-page admin-courses-page">
      {toast && <div className={`app-toast ${toast.type === 'error' ? 'app-toast-error' : ''}`} role="status">{toast.type === 'error' ? <AlertTriangle size={16} aria-hidden="true" /> : <span className="toast-check">✓</span>}{toast.message}</div>}
      {deleteTarget && <DeleteModal course={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />}

      <PageHeader
        eyebrow="Quản trị hệ thống"
        title="Quản lý khóa học"
        description="Theo dõi, tìm kiếm và quản lý toàn bộ khóa học trong hệ thống."
        action={<button type="button" className="btn btn-secondary" onClick={fetchCourses} disabled={loading}><RefreshCw size={16} className={loading ? 'icon-spin' : ''} aria-hidden="true" />Làm mới</button>}
      />

      <div className="metric-grid metric-grid-three">
        <MetricCard icon={BookOpen} label="Tổng khóa học" value={courses.length} tone="indigo" />
        <MetricCard icon={Eye} label="Đang hiển thị" value={filteredCourses.length} detail="theo bộ lọc hiện tại" tone="violet" />
        <MetricCard icon={Users} label="Lượt đăng ký" value={totalStudents} detail="tổng toàn hệ thống" tone="teal" />
      </div>

      <section className="app-section admin-courses-section">
        <div className="admin-courses-toolbar">
          <SearchField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm khóa học hoặc giảng viên..." label="Tìm khóa học hoặc giảng viên" />
          <SelectMenu label="Lọc theo danh mục" value={categoryFilter} options={categoryOptions} onChange={setCategoryFilter} />
          <SelectMenu label="Lọc theo cấp độ" value={levelFilter} options={LEVEL_OPTIONS} onChange={setLevelFilter} />
        </div>

        {loading ? <PageLoadingState label="Đang tải danh sách khóa học" /> : error ? <ErrorState title="Không thể tải danh sách khóa học" detail={error} onRetry={fetchCourses} /> : filteredCourses.length === 0 ? <EmptyState title="Không tìm thấy khóa học" detail="Thử đổi từ khóa hoặc bộ lọc để xem thêm kết quả." /> : (
          <>
            <div className="admin-courses-table-wrap">
              <table className="admin-courses-table">
                <thead><tr><th>Khóa học</th><th>Giảng viên</th><th>Danh mục</th><th>Cấp độ</th><th>Học viên</th><th>Bài học</th><th className="table-actions-cell">Thao tác</th></tr></thead>
                <tbody>
                  {filteredCourses.map((course) => (
                    <tr key={course.id}>
                      <td><div className="admin-course-name"><CourseThumbnail course={course} /><div><strong>{course.title}</strong><span>{Number(course.price || 0) > 0 ? `${Number(course.price).toLocaleString('vi-VN')} ₫` : 'Mở đăng ký'}</span></div></div></td>
                      <td>{course.lecturer_name || '—'}</td>
                      <td><StatusBadge tone="neutral"><Tag size={12} aria-hidden="true" />{CATEGORY_LABELS[course.category] || course.category || 'Tổng hợp'}</StatusBadge></td>
                      <td><StatusBadge tone={course.level === 'Advanced' ? 'danger' : course.level === 'Intermediate' ? 'warning' : 'success'}>{LEVEL_LABELS[course.level] || course.level || 'Cơ bản'}</StatusBadge></td>
                      <td><span className="table-number"><Users size={14} aria-hidden="true" />{course.student_count || 0}</span></td>
                      <td><span className="table-number"><FileText size={14} aria-hidden="true" />{course.lesson_count || 0}</span></td>
                      <td className="table-actions-cell"><div className="table-actions"><button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(`/courses/${course.id}`)} aria-label={`Xem ${course.title}`}><Eye size={15} aria-hidden="true" /></button><button type="button" className="btn btn-ghost btn-sm danger-action" onClick={() => setDeleteTarget(course)} aria-label={`Xóa ${course.title}`}><Trash2 size={15} aria-hidden="true" /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-courses-mobile-list">
              {filteredCourses.map((course) => (
                <article className="admin-course-mobile-card" key={course.id}>
                  <div className="admin-course-mobile-heading"><CourseThumbnail course={course} /><div><strong>{course.title}</strong><span>{course.lecturer_name || 'Chưa có giảng viên'}</span></div></div>
                  <div className="admin-course-mobile-meta"><StatusBadge tone="neutral">{CATEGORY_LABELS[course.category] || course.category || 'Tổng hợp'}</StatusBadge><StatusBadge tone={course.level === 'Advanced' ? 'danger' : course.level === 'Intermediate' ? 'warning' : 'success'}>{LEVEL_LABELS[course.level] || course.level || 'Cơ bản'}</StatusBadge><span>{course.student_count || 0} học viên</span></div>
                  <div className="admin-course-mobile-actions"><button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/courses/${course.id}`)}><Eye size={14} aria-hidden="true" />Xem</button><button type="button" className="btn btn-ghost btn-sm danger-action" onClick={() => setDeleteTarget(course)}><Trash2 size={14} aria-hidden="true" />Xóa</button></div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default AdminCourses;

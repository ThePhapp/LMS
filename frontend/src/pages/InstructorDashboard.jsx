import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, CircleDollarSign, Edit3, Eye, Plus, Trash2, Users } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { canManageCourse } from '../routing/access';
import { EmptyState, ErrorState, PageLoadingState } from '../components/ui/Feedback';
import {
  CourseCard,
  FilterTabs,
  MetricCard,
  PageHeader,
  SearchField,
  SectionHeader,
  SelectMenu,
} from '../components/ui/AppUI';
import { formatCurrency } from '../components/ui/utils';

const CATEGORY_OPTIONS = [
  { value: 'All', label: 'Tất cả môn học' },
  { value: 'Math', label: 'Toán' },
  { value: 'Vietnamese', label: 'Tiếng Việt' },
  { value: 'English', label: 'Tiếng Anh' },
  { value: 'Science', label: 'Khoa học' },
  { value: 'HistoryGeography', label: 'Lịch sử và địa lý' },
  { value: 'Arts', label: 'Mỹ thuật' },
];

const SCOPE_OPTIONS = [
  { value: 'my_courses', label: 'Của tôi' },
  { value: 'public_courses', label: 'Giảng viên khác' },
  { value: 'all', label: 'Tất cả' },
];

export default function InstructorDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scope, setScope] = useState('my_courses');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/courses', { params: { search: searchQuery, category } });
      let nextCourses = response.data || [];
      if (user?.role !== 'admin') {
        if (scope === 'my_courses') nextCourses = nextCourses.filter((course) => canManageCourse(user, course));
        if (scope === 'public_courses') nextCourses = nextCourses.filter((course) => !canManageCourse(user, course));
      }
      setCourses(nextCourses);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách khóa học.');
    } finally {
      setLoading(false);
    }
  }, [category, scope, searchQuery, user]);

  useEffect(() => {
    if (user && user.role !== 'lecturer' && user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchCourses();
  }, [fetchCourses, navigate, user]);

  const totals = useMemo(() => ({
    students: courses.reduce((sum, course) => sum + Number(course.student_count || 0), 0),
    lessons: courses.reduce((sum, course) => sum + Number(course.lesson_count || 0), 0),
    revenue: courses.reduce((sum, course) => sum + Number(course.student_count || 0) * Number(course.price || 0), 0),
  }), [courses]);

  const handleDelete = async (courseId) => {
    if (!window.confirm('Xóa khóa học này? Mọi dữ liệu liên quan sẽ không thể khôi phục.')) return;
    try {
      await api.delete(`/courses/${courseId}`);
      fetchCourses();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xóa khóa học.');
    }
  };

  return (
    <div className="app-page instructor-page">
      <PageHeader
        eyebrow="Không gian giảng dạy"
        title="Quản lý khóa học"
        description="Theo dõi quy mô lớp học và mở nhanh công việc cần xử lý."
        action={<Link to="/instructor/course/create" className="btn btn-primary"><Plus size={16} aria-hidden="true" />Tạo khóa học</Link>}
      />

      <div className="metric-grid metric-grid-four">
        <MetricCard icon={BookOpen} label="Khóa học" value={courses.length} detail="trong phạm vi đang xem" tone="indigo" />
        <MetricCard icon={Users} label="Học viên" value={totals.students} detail="lượt đăng ký" tone="teal" />
        <MetricCard icon={Edit3} label="Bài giảng" value={totals.lessons} detail="nội dung đã tạo" tone="violet" />
        <MetricCard icon={CircleDollarSign} label="Doanh thu ước tính" value={formatCurrency(totals.revenue)} tone="amber" />
      </div>

      <section className="app-section">
        <SectionHeader title="Danh sách khóa học" description={`${courses.length} khóa học trong kết quả hiện tại.`} />
        <div className="list-toolbar">
          <FilterTabs label="Phạm vi khóa học" value={scope} options={SCOPE_OPTIONS} onChange={setScope} />
          <div className="list-toolbar-controls">
            <SearchField value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm tên khóa học" label="Tìm khóa học" />
            <SelectMenu label="Lọc môn học" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
          </div>
        </div>

        {loading ? (
          <PageLoadingState label="Đang tải khóa học" />
        ) : error ? (
          <ErrorState title="Không thể tải khóa học" detail={error} onRetry={fetchCourses} />
        ) : courses.length === 0 ? (
          <EmptyState page action={scope === 'my_courses' ? <Link to="/instructor/course/create" className="btn btn-primary">Tạo khóa học</Link> : null}>
            <h3>Chưa có khóa học phù hợp</h3>
            <p>Thử thay đổi phạm vi, môn học hoặc từ khóa tìm kiếm.</p>
          </EmptyState>
        ) : (
          <div className="course-grid instructor-course-grid">
            {courses.map((course) => {
              const manageable = canManageCourse(user, course);
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  footer={(
                    <div className="course-management-actions">
                      <Link to={`/courses/${course.id}`} className="btn btn-ghost"><Eye size={15} aria-hidden="true" />Xem</Link>
                      {manageable && <Link to={`/instructor/course/${course.id}/students`} className="btn btn-ghost"><Users size={15} aria-hidden="true" />Học viên</Link>}
                      {manageable && <Link to={`/instructor/course/${course.id}/edit`} className="btn btn-secondary"><Edit3 size={15} aria-hidden="true" />Chỉnh sửa</Link>}
                      {manageable && <button type="button" className="btn btn-danger icon-button" onClick={() => handleDelete(course.id)} aria-label={`Xóa khóa học ${course.title}`}><Trash2 size={15} aria-hidden="true" /></button>}
                    </div>
                  )}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

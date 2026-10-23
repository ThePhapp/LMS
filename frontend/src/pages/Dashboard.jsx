import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Plus,
} from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { EmptyState, ErrorState, PageLoadingState } from '../components/ui/Feedback';
import {
  CourseCard,
  FilterTabs,
  MetricCard,
  PageHeader,
  SectionHeader,
  StatusBadge,
} from '../components/ui/AppUI';

const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chưa làm' },
  { value: 'submitted', label: 'Đã nộp' },
  { value: 'overdue', label: 'Quá hạn' },
];

function assignmentState(assignment) {
  const submitted = Number(assignment.submission_count || 0) > 0;
  const overdue = !submitted && assignment.due_date && new Date(assignment.due_date) < new Date();
  if (submitted) return 'submitted';
  if (overdue) return 'overdue';
  return 'pending';
}

function formatDeadline(value) {
  if (!value) return 'Không giới hạn';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        if (user?.role === 'student') {
          const [enrollmentResponse, courseResponse, assignmentResponse] = await Promise.all([
            api.get('/enrollments/my'),
            api.get('/courses'),
            api.get('/assignments/my'),
          ]);
          if (!cancelled) {
            setEnrollments(enrollmentResponse.data || []);
            setCourses(courseResponse.data || []);
            setAssignments(assignmentResponse.data || []);
          }
        } else {
          const response = await api.get('/courses');
          if (!cancelled) setCourses((response.data || []).filter((course) => course.lecturer_id === user?.id));
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.response?.data?.message || 'Không thể tải dữ liệu tổng quan.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (user) fetchData();
    return () => { cancelled = true; };
  }, [user]);

  const assignmentCounts = useMemo(() => assignments.reduce((counts, assignment) => {
    counts[assignmentState(assignment)] += 1;
    return counts;
  }, { pending: 0, submitted: 0, overdue: 0 }), [assignments]);

  const visibleAssignments = useMemo(() => assignments
    .filter((assignment) => assignmentFilter === 'all' || assignmentState(assignment) === assignmentFilter)
    .sort((left, right) => {
      const leftDue = left.due_date ? new Date(left.due_date).getTime() : Number.POSITIVE_INFINITY;
      const rightDue = right.due_date ? new Date(right.due_date).getTime() : Number.POSITIVE_INFINITY;
      return leftDue - rightDue;
    }), [assignmentFilter, assignments]);

  const firstName = user?.name?.trim().split(/\s+/).slice(-1)[0] || 'bạn';

  if (loading) return <PageLoadingState label="Đang tải tổng quan" />;
  if (error) return <ErrorState title="Không thể tải tổng quan" detail={error} onRetry={() => window.location.reload()} />;

  if (user?.role !== 'student') {
    return (
      <div className="app-page">
        <PageHeader
          eyebrow="Không gian giảng dạy"
          title={`Chào ${firstName}`}
          description="Theo dõi khóa học và tiếp tục công việc giảng dạy từ một nơi."
          action={<Link to="/instructor/course/create" className="btn btn-primary"><Plus size={16} aria-hidden="true" />Tạo khóa học</Link>}
        />
        <div className="metric-grid metric-grid-three">
          <MetricCard icon={BookOpen} label="Khóa học của tôi" value={courses.length} tone="indigo" />
          <MetricCard icon={ClipboardCheck} label="Bài giảng" value={courses.reduce((sum, course) => sum + Number(course.lesson_count || 0), 0)} tone="violet" />
          <MetricCard icon={GraduationCap} label="Học viên" value={courses.reduce((sum, course) => sum + Number(course.student_count || 0), 0)} tone="teal" />
        </div>
        <section className="app-section">
          <SectionHeader title="Khóa học gần đây" description="Mở khóa học để chỉnh sửa nội dung hoặc theo dõi học viên." action={<Link to="/instructor/dashboard" className="text-link">Mở trang quản lý</Link>} />
          {courses.length ? <div className="course-grid">{courses.slice(0, 3).map((course) => <CourseCard key={course.id} course={course} actionLabel="Quản lý khóa học" />)}</div> : <EmptyState page><h3>Chưa có khóa học</h3><p>Tạo khóa học đầu tiên để bắt đầu.</p></EmptyState>}
        </section>
      </div>
    );
  }

  return (
    <div className="app-page">
      <PageHeader
        eyebrow="Tổng quan học tập"
        title={`Chào ${firstName}`}
        description="Ưu tiên bài sắp đến hạn, sau đó tiếp tục khóa học đang theo dõi."
        action={<Link to="/courses" className="btn btn-primary"><BookOpen size={16} aria-hidden="true" />Khám phá khóa học</Link>}
      />

      <div className="metric-grid metric-grid-four">
        <MetricCard icon={BookOpen} label="Đang học" value={enrollments.length} detail="khóa học đã đăng ký" tone="indigo" />
        <MetricCard icon={CalendarClock} label="Cần làm" value={assignmentCounts.pending} detail="bài chưa đến hạn" tone="sky" />
        <MetricCard icon={ClipboardCheck} label="Quá hạn" value={assignmentCounts.overdue} detail="cần xử lý trước" tone="amber" />
        <MetricCard icon={CheckCircle2} label="Đã nộp" value={assignmentCounts.submitted} detail="bài đã gửi" tone="teal" />
      </div>

      <div className="dashboard-workspace">
        <section className="app-section task-section">
          <SectionHeader
            title="Việc cần làm"
            description="Bài tập được xếp theo hạn gần nhất."
            action={<FilterTabs label="Lọc bài tập" value={assignmentFilter} options={FILTERS.map((item) => ({ ...item, count: item.value === 'all' ? assignments.length : assignmentCounts[item.value] }))} onChange={setAssignmentFilter} />}
          />
          {visibleAssignments.length === 0 ? (
            <EmptyState><p>Không có bài tập nào ở trạng thái này.</p></EmptyState>
          ) : (
            <div className="task-list">
              {visibleAssignments.map((assignment) => {
                const state = assignmentState(assignment);
                return (
                  <article className="task-row" key={assignment.id}>
                    <div className="task-date" aria-hidden="true"><CalendarClock size={17} /></div>
                    <div className="task-main">
                      <div className="task-title-line">
                        <h3><Link to={`/assignments/${assignment.id}`}>{assignment.title}</Link></h3>
                        {state === 'overdue' && <StatusBadge tone="danger">Quá hạn</StatusBadge>}
                        {state === 'submitted' && <StatusBadge tone="success">Đã nộp</StatusBadge>}
                        {state === 'pending' && <StatusBadge>Chưa làm</StatusBadge>}
                      </div>
                      <p>{assignment.course_title} · {assignment.total_points} điểm</p>
                    </div>
                    <div className="task-side">
                      <span className={state === 'overdue' ? 'is-overdue' : ''}>{formatDeadline(assignment.due_date)}</span>
                      <Link to={`/assignments/${assignment.id}`} className="btn btn-secondary">Mở bài</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="app-section continue-section">
          <SectionHeader title="Tiếp tục học" description="Các khóa học bạn đã đăng ký." action={<Link to="/courses" className="text-link">Xem tất cả</Link>} />
          {enrollments.length === 0 ? (
            <EmptyState page action={<Link to="/courses" className="btn btn-primary">Khám phá khóa học</Link>}>
              <h3>Chưa có khóa học</h3>
              <p>Chọn một khóa học phù hợp để bắt đầu.</p>
            </EmptyState>
          ) : (
            <div className="continue-list">
              {enrollments.slice(0, 3).map((course) => <CourseCard key={course.id} course={course} compact actionLabel="Tiếp tục học" />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

class CourseAccessError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'CourseAccessError';
    this.statusCode = statusCode;
  }
}

function parseId(value, label = 'ID') {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CourseAccessError(400, `${label} must be a positive integer`);
  }
  return parsed;
}

function isCourseOwner(course, user) {
  return Boolean(
    user
    && (user.role === 'admin'
      || (user.role === 'lecturer' && Number(course.lecturer_id) === Number(user.id)))
  );
}

async function getCourse(executor, courseId) {
  const id = parseId(courseId, 'Course ID');
  const [courses] = await executor.query(
    'SELECT * FROM courses WHERE id = ?',
    [id]
  );
  return courses[0] || null;
}

async function hasCourseAccess(executor, course, user) {
  if (!user) return false;
  if (isCourseOwner(course, user)) return true;
  if (user.role !== 'student') return false;

  const [enrollments] = await executor.query(
    'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
    [user.id, course.id]
  );
  return enrollments.length > 0;
}

async function requireCourseAccess(executor, courseId, user) {
  const course = await getCourse(executor, courseId);
  if (!course) throw new CourseAccessError(404, 'Course not found');
  if (!(await hasCourseAccess(executor, course, user))) {
    throw new CourseAccessError(403, 'Not authorized for this course');
  }
  return course;
}

async function requireCourseOwner(executor, courseId, user) {
  const course = await getCourse(executor, courseId);
  if (!course) throw new CourseAccessError(404, 'Course not found');
  if (!isCourseOwner(course, user)) {
    throw new CourseAccessError(403, 'Not authorized for this course');
  }
  return course;
}

async function requireLessonAccess(executor, lessonId, user) {
  const id = parseId(lessonId, 'Lesson ID');
  const [lessons] = await executor.query(
    `SELECT l.id, l.course_id, c.lecturer_id
     FROM lessons l
     JOIN courses c ON c.id = l.course_id
     WHERE l.id = ?`,
    [id]
  );
  if (!lessons.length) throw new CourseAccessError(404, 'Lesson not found');

  const lesson = lessons[0];
  if (!(await hasCourseAccess(executor, {
    id: lesson.course_id,
    lecturer_id: lesson.lecturer_id,
  }, user))) {
    throw new CourseAccessError(403, 'Not authorized for this lesson');
  }
  return lesson;
}

function sendControllerError(res, error) {
  if (error instanceof CourseAccessError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  return res.status(500).json({ message: 'Internal server error' });
}

module.exports = {
  CourseAccessError,
  getCourse,
  hasCourseAccess,
  isCourseOwner,
  parseId,
  requireCourseAccess,
  requireCourseOwner,
  requireLessonAccess,
  sendControllerError,
};

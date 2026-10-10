class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

function parseId(value, label = 'ID') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `${label} must be a positive integer`);
  }
  return id;
}

function sameId(left, right) {
  return String(left) === String(right);
}

async function resolveCourse(executor, courseId, { lock = false } = {}) {
  const id = parseId(courseId, 'Course ID');
  const lockClause = lock ? ' FOR UPDATE' : '';
  const [rows] = await executor.query(
    `SELECT * FROM courses WHERE id = ?${lockClause}`,
    [id]
  );
  if (rows.length === 0) throw new HttpError(404, 'Course not found');
  return rows[0];
}

async function resolveAssignment(executor, assignmentId, { lock = null } = {}) {
  const id = parseId(assignmentId, 'Assignment ID');
  const lockClause = lock === 'update'
    ? ' FOR UPDATE OF a'
    : lock === 'share'
      ? ' FOR SHARE OF a'
      : '';
  const [rows] = await executor.query(
    `SELECT a.*, c.lecturer_id
     FROM assignments a
     JOIN courses c ON c.id = a.course_id
     WHERE a.id = ?${lockClause}`,
    [id]
  );
  if (rows.length === 0) throw new HttpError(404, 'Assignment not found');
  return rows[0];
}

async function resolveQuestion(executor, questionId) {
  const id = parseId(questionId, 'Question ID');
  const [rows] = await executor.query(
    `SELECT aq.*, a.course_id, a.status AS assignment_status,
            a.type AS assignment_type, c.lecturer_id
     FROM assignment_questions aq
     JOIN assignments a ON a.id = aq.assignment_id
     JOIN courses c ON c.id = a.course_id
     WHERE aq.id = ?`,
    [id]
  );
  if (rows.length === 0) throw new HttpError(404, 'Question not found');
  return rows[0];
}

async function resolveSubmission(executor, submissionId) {
  const id = parseId(submissionId, 'Submission ID');
  const [rows] = await executor.query(
    `SELECT s.*, a.course_id, a.title AS assignment_title,
            a.total_points, a.status AS assignment_status, c.lecturer_id
     FROM assignment_submissions s
     JOIN assignments a ON a.id = s.assignment_id
     JOIN courses c ON c.id = a.course_id
     WHERE s.id = ?`,
    [id]
  );
  if (rows.length === 0) throw new HttpError(404, 'Submission not found');
  return rows[0];
}

function requireOwnerOrAdmin(user, resource) {
  if (user?.role === 'admin') return;
  if (user?.role !== 'lecturer' || !sameId(user.id, resource.lecturer_id)) {
    throw new HttpError(403, 'Not authorized');
  }
}

function requireStudent(user) {
  if (user?.role !== 'student') {
    throw new HttpError(403, 'Student access required');
  }
}

async function requireEnrollment(executor, user, courseId, { lock = false } = {}) {
  requireStudent(user);
  const lockClause = lock ? ' FOR UPDATE' : '';
  const [rows] = await executor.query(
    `SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?${lockClause}`,
    [user.id, courseId]
  );
  if (rows.length === 0) throw new HttpError(403, 'You are not enrolled in this course');
  return rows[0];
}

async function requireStudentAssignmentAccess(executor, user, assignment, { lockEnrollment = false } = {}) {
  requireStudent(user);
  if (assignment.status !== 'published') {
    throw new HttpError(403, 'Assignment is not published');
  }
  await requireEnrollment(executor, user, assignment.course_id, { lock: lockEnrollment });
}

function badRequest(message) {
  throw new HttpError(400, message);
}

module.exports = {
  HttpError,
  badRequest,
  parseId,
  requireEnrollment,
  requireOwnerOrAdmin,
  requireStudent,
  requireStudentAssignmentAccess,
  resolveAssignment,
  resolveCourse,
  resolveQuestion,
  resolveSubmission,
};

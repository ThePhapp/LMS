const REQUIRED_TABLES = Object.freeze([
  'users',
  'courses',
  'chapters',
  'lessons',
  'enrollments',
  'lesson_progress',
  'notes',
  'comments',
  'forum_topics',
  'forum_replies',
  'assignments',
  'assignment_questions',
  'assignment_submissions',
  'events',
  'notifications',
  'schema_migrations',
]);

const REQUIRED_INDEXES = Object.freeze([
  'users_email_lower_uidx',
  'chapters_id_course_uidx',
  'assignment_submissions_attempt_uidx',
  'courses_lecturer_idx',
  'lessons_course_order_idx',
  'enrollments_course_student_idx',
  'assignments_course_status_due_idx',
  'events_course_start_idx',
  'notifications_user_unread_idx',
]);

const REQUIRED_CONSTRAINTS = Object.freeze([
  'lessons_chapter_course_fk',
  'assignments_chapter_course_fk',
  'courses_price_nonnegative_check',
  'assignments_points_positive_check',
  'assignments_attempts_nonnegative_check',
  'submissions_attempt_positive_check',
  'events_time_order_check',
]);

function missing(required, actual) {
  const found = new Set(actual);
  return required.filter((name) => !found.has(name));
}

async function inspectSchema(client) {
  const tables = await client.query(
    `SELECT tablename AS name FROM pg_tables
     WHERE schemaname = current_schema() AND tablename = ANY($1::text[])`,
    [REQUIRED_TABLES],
  );
  const indexes = await client.query(
    `SELECT indexname AS name FROM pg_indexes
     WHERE schemaname = current_schema() AND indexname = ANY($1::text[])`,
    [REQUIRED_INDEXES],
  );
  const constraints = await client.query(
    `SELECT conname AS name FROM pg_constraint
     WHERE conname = ANY($1::text[])`,
    [REQUIRED_CONSTRAINTS],
  );

  return {
    missingTables: missing(REQUIRED_TABLES, tables.rows.map((row) => row.name)),
    missingIndexes: missing(REQUIRED_INDEXES, indexes.rows.map((row) => row.name)),
    missingConstraints: missing(REQUIRED_CONSTRAINTS, constraints.rows.map((row) => row.name)),
  };
}

function assertSchema(report) {
  const problems = [
    ...report.missingTables.map((name) => `table:${name}`),
    ...report.missingIndexes.map((name) => `index:${name}`),
    ...report.missingConstraints.map((name) => `constraint:${name}`),
  ];
  if (problems.length) throw new Error(`Database schema is incomplete: ${problems.join(', ')}`);
}

module.exports = {
  REQUIRED_CONSTRAINTS,
  REQUIRED_INDEXES,
  REQUIRED_TABLES,
  assertSchema,
  inspectSchema,
};

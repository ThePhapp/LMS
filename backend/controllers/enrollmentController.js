const db = require('../config/db');
const {
  CourseAccessError,
  getCourse,
  parseId,
  requireCourseOwner,
  sendControllerError,
} = require('../services/courseAccess');

exports.enroll = async (req, res) => {
  try {
    const body = req.body || {};
    if (req.user.role !== 'student') {
      throw new CourseAccessError(403, 'Only students can enroll in courses');
    }
    if (body.student_id !== undefined && Number(body.student_id) !== Number(req.user.id)) {
      throw new CourseAccessError(403, 'Students may only enroll themselves');
    }

    const courseId = parseId(body.course_id, 'Course ID');
    const course = await getCourse(db, courseId);
    if (!course) throw new CourseAccessError(404, 'Course not found');
    if (Number(course.price) > 0) {
      throw new CourseAccessError(402, 'Payment is required before enrolling in this course');
    }

    const [existing] = await db.query(
      'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
      [req.user.id, course.id]
    );
    if (existing.length) {
      throw new CourseAccessError(409, 'Already enrolled in this course');
    }

    await db.query(
      'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)',
      [req.user.id, course.id]
    );
    return res.status(201).json({ message: 'Successfully enrolled' });
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Already enrolled in this course' });
    }
    return sendControllerError(res, error);
  }
};

exports.getMyEnrollments = async (req, res) => {
  try {
    const [courses] = await db.query(`
      SELECT c.*, e.enrolled_at
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.student_id = ?
    `, [req.user.id]);
    return res.json(courses);
  } catch (error) {
    return sendControllerError(res, error);
  }
};

exports.getCourseStudents = async (req, res) => {
  try {
    const course = await requireCourseOwner(db, req.params.courseId, req.user);
    const [lessons] = await db.query('SELECT id FROM lessons WHERE course_id = ?', [course.id]);
    const totalLessons = lessons.length;
    const [students] = await db.query(`
      SELECT
        u.id, u.name, u.email, u.avatar_url,
        e.enrolled_at,
        COUNT(DISTINCT lp.lesson_id) as completed_lessons,
        ROUND(COUNT(DISTINCT lp.lesson_id) * 100.0 / NULLIF(?, 0), 1) as progress_percentage,
        MAX(lp.completed_at) as last_activity
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      LEFT JOIN lesson_progress lp ON lp.student_id = u.id
        AND lp.lesson_id IN (SELECT id FROM lessons WHERE course_id = ?)
        AND lp.completed = TRUE
      WHERE e.course_id = ?
      GROUP BY u.id, u.name, u.email, u.avatar_url, e.enrolled_at
      ORDER BY e.enrolled_at DESC
    `, [totalLessons, course.id, course.id]);

    return res.json({
      course: { id: course.id, title: course.title, total_lessons: totalLessons },
      students,
    });
  } catch (error) {
    return sendControllerError(res, error);
  }
};

exports.getStudentProgress = async (req, res) => {
  try {
    const course = await requireCourseOwner(db, req.params.courseId, req.user);
    const studentId = parseId(req.params.studentId, 'Student ID');
    const [students] = await db.query(
      `SELECT u.id, u.name, u.email, u.avatar_url
       FROM users u
       JOIN enrollments e ON e.student_id = u.id
       WHERE u.id = ? AND e.course_id = ?`,
      [studentId, course.id]
    );
    if (!students.length) {
      throw new CourseAccessError(404, 'Student is not enrolled in this course');
    }

    const [lessons] = await db.query(`
      SELECT
        l.id, l.title, l.chapter_id, l.lesson_order, l.duration,
        ch.title as chapter_title,
        lp.completed, lp.completed_at
      FROM lessons l
      LEFT JOIN chapters ch ON l.chapter_id = ch.id
      LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = ?
      WHERE l.course_id = ?
      ORDER BY ch.chapter_order, l.lesson_order
    `, [studentId, course.id]);
    const [submissions] = await db.query(`
      SELECT
        a.id as assignment_id, a.title, a.total_points,
        sub.score, sub.status, sub.submitted_at
      FROM assignments a
      LEFT JOIN assignment_submissions sub
        ON sub.assignment_id = a.id AND sub.student_id = ?
      WHERE a.course_id = ?
      ORDER BY a.created_at
    `, [studentId, course.id]);

    const completedLessons = lessons.filter((lesson) => lesson.completed === true).length;
    const totalLessons = lessons.length;
    return res.json({
      student: students[0],
      course: { id: course.id, title: course.title },
      progress: {
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        progress_percentage: totalLessons
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0,
      },
      lessons,
      assignments: submissions,
    });
  } catch (error) {
    return sendControllerError(res, error);
  }
};

const db = require('../config/db');

function sendAdminError(res) {
  return res.status(500).json({ message: 'Unable to load administration data' });
}

exports.getDashboardStats = async (req, res) => {
  try {
    const [usersResult, coursesResult, enrollmentsResult, usersListResult] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users'),
      db.query('SELECT COUNT(*) as count FROM courses'),
      db.query('SELECT COUNT(*) as count FROM enrollments'),
      db.query('SELECT id, name, email, role, avatar_url FROM users ORDER BY id DESC'),
    ]);
    const [usersCount] = usersResult;
    const [coursesCount] = coursesResult;
    const [enrollmentsCount] = enrollmentsResult;
    const [usersList] = usersListResult;

    return res.json({
      stats: {
        totalUsers: Number(usersCount[0]?.count || 0),
        totalCourses: Number(coursesCount[0]?.count || 0),
        totalEnrollments: Number(enrollmentsCount[0]?.count || 0),
      },
      users: usersList,
    });
  } catch (error) {
    return sendAdminError(res);
  }
};

exports.getAdminCourses = async (req, res) => {
  try {
    const [courses] = await db.query(`
      SELECT c.id, c.title, c.category, c.level, c.price, c.thumbnail_url, c.created_at,
             u.name as lecturer_name, u.id as lecturer_id,
             COUNT(DISTINCT e.id) as student_count,
             COUNT(DISTINCT l.id) as lesson_count
      FROM courses c
      JOIN users u ON c.lecturer_id = u.id
      LEFT JOIN enrollments e ON e.course_id = c.id
      LEFT JOIN lessons l ON l.course_id = c.id
      GROUP BY c.id, c.title, c.category, c.level, c.price, c.thumbnail_url, c.created_at, u.name, u.id
      ORDER BY c.id DESC
    `);
    return res.json(courses);
  } catch (error) {
    return sendAdminError(res);
  }
};

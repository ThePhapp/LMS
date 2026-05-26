const db = require('../config/db');

exports.getDashboardStats = async (req, res) => {
  try {
    const [usersCount] = await db.query('SELECT COUNT(*) as count FROM users');
    const [coursesCount] = await db.query('SELECT COUNT(*) as count FROM courses');
    const [enrollmentsCount] = await db.query('SELECT COUNT(*) as count FROM enrollments');
    
    // Get list of all users, excluding passwords
    const [usersList] = await db.query(
      'SELECT id, name, email, role, avatar_url FROM users ORDER BY id DESC'
    );

    res.json({
      stats: {
        totalUsers: usersCount[0].count,
        totalCourses: coursesCount[0].count,
        totalEnrollments: enrollmentsCount[0].count,
      },
      users: usersList
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.adminDeleteCourse = async (req, res) => {
  try {
    const [course] = await db.query('SELECT id, title FROM courses WHERE id = ?', [req.params.id]);
    if (course.length === 0) return res.status(404).json({ message: 'Course not found' });
    await db.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Course deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

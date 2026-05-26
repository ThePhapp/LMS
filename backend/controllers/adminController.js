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

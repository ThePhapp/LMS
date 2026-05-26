const express = require('express');
const router = express.Router();
const { getDashboardStats, getAdminCourses, adminDeleteCourse } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/dashboard-stats', protect, authorize('admin'), getDashboardStats);
router.get('/courses', protect, authorize('admin'), getAdminCourses);
router.delete('/courses/:id', protect, authorize('admin'), adminDeleteCourse);

module.exports = router;

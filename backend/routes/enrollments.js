const express = require('express');
const router = express.Router();
const { enroll, getMyEnrollments, getCourseStudents, getStudentProgress } = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('student'), enroll);
router.get('/my', protect, authorize('student'), getMyEnrollments);
router.get('/course/:courseId/students', protect, authorize('lecturer', 'admin'), getCourseStudents);
router.get('/course/:courseId/student/:studentId', protect, authorize('lecturer', 'admin'), getStudentProgress);

module.exports = router;

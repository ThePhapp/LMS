const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getCourses, getCourseById, createCourse, updateCourse, deleteCourse } = require('../controllers/courseController');
const { protect, optionalAuth, authorize } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.route('/')
  .get(optionalAuth, getCourses)
  .post(protect, authorize('lecturer', 'admin'), upload.single('thumbnail'), createCourse);

router.route('/:id')
  .get(optionalAuth, getCourseById)
  .put(protect, authorize('lecturer', 'admin'), upload.single('thumbnail'), updateCourse)
  .delete(protect, authorize('lecturer', 'admin'), deleteCourse);

module.exports = router;

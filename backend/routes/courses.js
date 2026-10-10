const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getCourses, getCourseById, createCourse, updateCourse, deleteCourse } = require('../controllers/courseController');
const { protect, optionalAuth, authorize } = require('../middleware/authMiddleware');
const { validateUploadedBuffer } = require('../utils/fileValidation');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

function validateImage(req, res, next) {
  if (!req.file) return next();
  try {
    req.file.detectedMime = validateUploadedBuffer(req.file.buffer, req.file.originalname, 'image').mimeType;
    return next();
  } catch (error) {
    return res.status(error.statusCode || 415).json({
      code: error.code || 'FILE_INVALID',
      message: error.message || 'Image validation failed',
    });
  }
}

router.route('/')
  .get(optionalAuth, getCourses)
  .post(protect, authorize('lecturer', 'admin'), upload.single('thumbnail'), validateImage, createCourse);

router.route('/:id')
  .get(optionalAuth, getCourseById)
  .put(protect, authorize('lecturer', 'admin'), upload.single('thumbnail'), validateImage, updateCourse)
  .delete(protect, authorize('lecturer', 'admin'), deleteCourse);

module.exports = router;

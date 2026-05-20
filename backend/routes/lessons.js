const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createLesson, updateLesson, deleteLesson, markProgress, getProgressForCourse, getPackageInfo } = require('../controllers/lessonController');
const { protect, authorize } = require('../middleware/authMiddleware');

const tempUploadDir = path.join(__dirname, '../uploads/tmp');
fs.mkdirSync(tempUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, tempUploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `lesson-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB for video/packages
  fileFilter(req, file, cb) {
    const allowed = [
      '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.xlsx', '.xls',
      '.mp4', '.webm', '.mov', '.avi', '.mkv', '.mp3', '.wav',
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
      '.zip' // Web package export
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('File type not allowed'));
    cb(null, true);
  }
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File quá lớn. Giới hạn tối đa là 500MB.' });
    }
    return res.status(400).json({ message: error.message || 'Upload file thất bại' });
  });
}

router.post('/', protect, authorize('lecturer', 'admin'), handleUpload, createLesson);
router.put('/:id', protect, authorize('lecturer', 'admin'), handleUpload, updateLesson);
router.delete('/:id', protect, authorize('lecturer', 'admin'), deleteLesson);
router.get('/:lessonId/package-info', protect, getPackageInfo);
router.post('/progress', protect, markProgress);
router.get('/progress/:courseId', protect, getProgressForCourse);

module.exports = router;

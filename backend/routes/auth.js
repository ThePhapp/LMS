const express = require('express');
const router = express.Router();
const multer = require('multer');
const { register, login, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validateUploadedBuffer } = require('../utils/fileValidation');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });

function validateAvatar(req, res, next) {
  if (!req.file) return next();
  try {
    req.file.detectedMime = validateUploadedBuffer(req.file.buffer, req.file.originalname, 'image').mimeType;
    return next();
  } catch (error) {
    return res.status(error.statusCode || 415).json({
      code: error.code || 'FILE_INVALID',
      message: error.message || 'Avatar validation failed',
    });
  }
}

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.patch('/me', protect, upload.single('avatar'), validateAvatar, updateProfile);

module.exports = router;

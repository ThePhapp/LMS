const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { Transform, pipeline } = require('stream');
const { createLesson, updateLesson, deleteLesson, markProgress, getProgressForCourse, getPackageInfo } = require('../controllers/lessonController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ZIP_LIMITS } = require('../utils/zipHandler');
const { CONTEXT_EXTENSIONS, validateUploadedFile } = require('../utils/fileValidation');

const tempUploadDir = path.join(__dirname, '../uploads/tmp');
fs.mkdirSync(tempUploadDir, { recursive: true });

function sizeLimitError(isZip) {
  const error = new multer.MulterError('LIMIT_FILE_SIZE', 'file');
  if (isZip) {
    error.code = 'ZIP_TOO_LARGE';
    error.statusCode = 413;
    error.message = 'ZIP upload exceeds the 100 MiB limit';
  }
  return error;
}

const storage = {
  _handleFile(req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    const isZip = extension === '.zip';
    const byteLimit = isZip ? ZIP_LIMITS.maxCompressedBytes : 500 * 1024 * 1024;
    const filename = `lesson-${randomUUID()}${extension}`;
    const filePath = path.join(tempUploadDir, filename);
    let bytesWritten = 0;
    let fileCreated = false;

    const limiter = new Transform({
      transform(chunk, encoding, done) {
        bytesWritten += chunk.length;
        if (bytesWritten > byteLimit) {
          done(sizeLimitError(isZip));
          return;
        }
        done(null, chunk);
      }
    });
    const output = fs.createWriteStream(filePath, { flags: 'wx', mode: 0o600 });
    output.once('open', () => {
      fileCreated = true;
    });

    pipeline(file.stream, limiter, output, (error) => {
      if (!error) {
        cb(null, {
          destination: tempUploadDir,
          filename,
          path: filePath,
          size: bytesWritten
        });
        return;
      }

      if (!fileCreated) {
        cb(error);
        return;
      }

      fs.unlink(filePath, (cleanupError) => {
        if (cleanupError && cleanupError.code !== 'ENOENT') {
          const wrappedError = new Error('Upload cleanup failed');
          wrappedError.code = 'UPLOAD_CLEANUP_FAILED';
          wrappedError.statusCode = 500;
          cb(wrappedError);
          return;
        }
        cb(error);
      });
    });
  },

  _removeFile(req, file, cb) {
    const filePath = file.path;
    delete file.destination;
    delete file.filename;
    delete file.path;
    fs.unlink(filePath, (error) => cb(error?.code === 'ENOENT' ? null : error));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB for video/packages
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!CONTEXT_EXTENSIONS.lesson.has(ext)) {
      const error = new Error('File type not allowed');
      error.code = 'FILE_TYPE_NOT_ALLOWED';
      error.statusCode = 415;
      return cb(error);
    }
    cb(null, true);
  }
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, async (error) => {
    if (!error) {
      const extension = req.file ? path.extname(req.file.originalname).toLowerCase() : '';
      if (extension === '.zip' && req.file.size > ZIP_LIMITS.maxCompressedBytes) {
        try {
          await fs.promises.unlink(req.file.path);
          req.file = undefined;
        } catch (cleanupError) {
          if (cleanupError.code !== 'ENOENT') {
            return res.status(500).json({
              code: 'ZIP_CLEANUP_FAILED',
              message: 'ZIP cleanup failed'
            });
          }
        }
        return res.status(413).json({
          code: 'ZIP_TOO_LARGE',
          message: 'ZIP upload exceeds the 100 MiB limit'
        });
      }
      if (req.file) {
        try {
          const validated = await validateUploadedFile(req.file.path, req.file.originalname, 'lesson');
          req.file.detectedMime = validated.mimeType;
        } catch (validationError) {
          await fs.promises.unlink(req.file.path).catch(() => {});
          req.file = undefined;
          return res.status(validationError.statusCode || 415).json({
            code: validationError.code || 'FILE_INVALID',
            message: validationError.message || 'File validation failed',
          });
        }
      }
      return next();
    }

    if (req.file?.path) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      req.file = undefined;
    }
    if (error.code === 'ZIP_TOO_LARGE') {
      return res.status(413).json({ code: error.code, message: error.message });
    }
    if (Number.isInteger(error.statusCode)) {
      return res.status(error.statusCode).json({ code: error.code, message: error.message });
    }
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

const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { protect: auth, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { CONTEXT_EXTENSIONS, validateUploadedFile } = require('../utils/fileValidation');
const { deleteStoredFile, uploadPrivateFileToStorage } = require('../config/storage');

const submissionUploadDir = path.resolve(__dirname, '../uploads/tmp/submissions');
fs.mkdirSync(submissionUploadDir, { recursive: true, mode: 0o700 });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, submissionUploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${extension}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!CONTEXT_EXTENSIONS.assignment.has(extension)) {
      const error = new Error('File type is not allowed');
      error.code = 'FILE_TYPE_NOT_ALLOWED';
      error.statusCode = 415;
      return cb(error);
    }
    return cb(null, true);
  },
});

function handleSubmissionUpload(req, res, next) {
  upload.single('file')(req, res, async (error) => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : (error.statusCode || 400);
      return res.status(status).json({
        code: error.code || 'UPLOAD_FAILED',
        message: error.code === 'LIMIT_FILE_SIZE'
          ? 'File exceeds the 10 MiB limit'
          : error.message || 'File upload failed',
      });
    }
    if (!req.file) return next();

    try {
      const validated = await validateUploadedFile(req.file.path, req.file.originalname, 'assignment');
      req.file.detectedMime = validated.mimeType;
      req.file.storageLocator = await uploadPrivateFileToStorage(
        req.file.path,
        'submission-files',
        req.file.filename,
        validated.mimeType,
      );
      await fs.promises.unlink(req.file.path);
      req.file.path = undefined;
      return next();
    } catch (validationError) {
      if (req.file?.storageLocator) {
        await deleteStoredFile(req.file.storageLocator).catch(() => {});
      }
      if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
      req.file = undefined;
      return res.status(validationError.statusCode || 415).json({
        code: validationError.code || 'FILE_INVALID',
        message: validationError.message || 'File validation failed',
      });
    }
  });
}

// Get all assignments for a course
router.get('/course/:courseId', auth, assignmentController.getAssignments);

// Create an assignment
router.post('/course/:courseId', auth, authorize('lecturer', 'admin'), assignmentController.createAssignment);

// Get grades for a course (Gradebook)
router.get('/course/:courseId/grades', auth, authorize('lecturer', 'admin'), assignmentController.getCourseGrades);

// Notifications
router.get('/notifications', auth, assignmentController.getNotifications);
router.put('/notifications/:notifId/read', auth, assignmentController.markNotificationRead);

// Get all assignments for current student
router.get('/my', auth, assignmentController.getMyAllAssignments);


// Get, Submit, Update, and Delete a specific assignment
router.route('/:id')
  .get(auth, assignmentController.getAssignmentById)
  .post(auth, handleSubmissionUpload, assignmentController.submitAssignment)
  .put(auth, authorize('lecturer', 'admin'), assignmentController.updateAssignment)
  .delete(auth, authorize('lecturer', 'admin'), assignmentController.deleteAssignment);

// Assignment statistics
router.get('/:id/stats', auth, authorize('lecturer', 'admin'), assignmentController.getAssignmentStats);

// Student's own submissions for an assignment
router.get('/:id/my-submissions', auth, assignmentController.getMySubmissions);

// Add Question to a Quiz assignment
router.post('/:id/questions', auth, authorize('lecturer', 'admin'), assignmentController.addQuestion);

// Bulk save all questions for a Quiz assignment
router.put('/:id/questions/bulk', auth, authorize('lecturer', 'admin'), assignmentController.bulkSaveQuestions);

// Update a question
router.put('/questions/:questionId', auth, authorize('lecturer', 'admin'), assignmentController.updateQuestion);

// Delete a question from a Quiz assignment
router.delete('/questions/:questionId', auth, authorize('lecturer', 'admin'), assignmentController.deleteQuestion);

// Get all submissions for an assignment
router.get('/:id/submissions', auth, authorize('lecturer', 'admin'), assignmentController.getSubmissions);

// Grade a specific submission
router.put('/submissions/:subId', auth, authorize('lecturer', 'admin'), assignmentController.gradeSubmission);

module.exports = router;

const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { protect: auth, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');

// Multer storage for essay file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

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
  .post(auth, upload.single('file'), assignmentController.submitAssignment)
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

const express = require('express');

const fileController = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/lessons/:id/access', protect, fileController.getLessonAccess);
router.get('/lessons/:id/content', fileController.streamLesson);
router.get('/submissions/:id/access', protect, fileController.getSubmissionAccess);
router.get('/submissions/:id/content', fileController.streamSubmission);
router.get('/packages/:id/*assetPath', fileController.streamPackageAsset);

module.exports = router;

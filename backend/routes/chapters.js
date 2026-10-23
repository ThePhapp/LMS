const express = require('express');
const router = express.Router();
const chapterController = require('../controllers/chapterController');
const { protect: auth, authorize } = require('../middleware/authMiddleware');

router.post('/', auth, authorize('lecturer', 'admin'), chapterController.createChapter);
router.put('/:id', auth, authorize('lecturer', 'admin'), chapterController.updateChapter);
router.delete('/:id', auth, authorize('lecturer', 'admin'), chapterController.deleteChapter);

module.exports = router;

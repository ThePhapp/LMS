const express = require('express');
const { chat } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const { createAiRateLimiter } = require('../middleware/aiRateLimiter');

const router = express.Router();
const aiRateLimiter = createAiRateLimiter();

router.post('/chat', protect, aiRateLimiter, chat);

module.exports = router;

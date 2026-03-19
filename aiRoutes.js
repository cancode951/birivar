const express = require('express');
const authMiddleware = require('./authMiddleware');
const { askAI, chat } = require('./aiController');
const { consumeLimit } = require('./middleware/planLimits');

const router = express.Router();

// POST /api/ai/ask - sadece giriş yapmış kullanıcılar
router.post('/ask', authMiddleware, consumeLimit('ai'), askAI);

// POST /api/ai/chat - sohbet endpoint'i
router.post('/chat', authMiddleware, consumeLimit('ai'), chat);

module.exports = router;


const express = require('express');
const authMiddleware = require('./authMiddleware');
const { askAI, chat } = require('./aiController');

const router = express.Router();

// POST /api/ai/ask - sadece giriş yapmış kullanıcılar
router.post('/ask', authMiddleware, askAI);

// POST /api/ai/chat - sohbet endpoint'i
router.post('/chat', authMiddleware, chat);

module.exports = router;


const express = require('express');
const authMiddleware = require('../authMiddleware');
const { sendMessage, getConversation, getInbox, markAsRead, getUnreadCount } = require('../controllers/messageController');

const router = express.Router();

router.get('/inbox', authMiddleware, getInbox);
router.get('/unread-count', authMiddleware, getUnreadCount);
router.patch('/mark-as-read', authMiddleware, markAsRead);
router.post('/send', authMiddleware, sendMessage);
router.get('/:userId', authMiddleware, getConversation);

module.exports = router;


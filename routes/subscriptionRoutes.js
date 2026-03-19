const express = require('express');
const authMiddleware = require('../authMiddleware');
const {
  getMySubscription,
  createCheckout,
} = require('../controllers/subscriptionController');

const router = express.Router();

router.get('/me', authMiddleware, getMySubscription);
router.post('/checkout', authMiddleware, createCheckout);

module.exports = router;

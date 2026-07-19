const express = require('express');
const { getAnalytics } = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/analytics', authenticate, authorize('ADMIN', 'PHARMACIST', 'CASHIER'), getAnalytics);

module.exports = router;

const express = require('express');
const { getDashboardStats } = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'PHARMACIST', 'CASHIER'), getDashboardStats);

module.exports = router;

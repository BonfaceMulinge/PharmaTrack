const express = require('express');
const { verifyPin } = require('../controllers/pinController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/verify', authenticate, authorize('ADMIN', 'PHARMACIST', 'CASHIER'), verifyPin);

module.exports = router;

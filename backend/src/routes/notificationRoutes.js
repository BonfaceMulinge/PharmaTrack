const express = require('express');
const { getNotifications, createNotification } = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'STORE_MANAGER', 'PHARMACIST'), getNotifications);
router.post('/', authenticate, authorize('ADMIN', 'STORE_MANAGER'), createNotification);

module.exports = router;

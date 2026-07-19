const express = require('express');
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'CASHIER', 'PHARMACIST'), getNotifications);
router.patch('/read-all', authenticate, authorize('ADMIN', 'CASHIER', 'PHARMACIST'), markAllAsRead);
router.patch('/:id/read', authenticate, authorize('ADMIN', 'CASHIER', 'PHARMACIST'), markAsRead);

module.exports = router;

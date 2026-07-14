const express = require('express');
const { getPurchases, createPurchase } = require('../controllers/purchaseController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'STORE_MANAGER'), getPurchases);
router.post('/', authenticate, authorize('ADMIN', 'STORE_MANAGER'), createPurchase);

module.exports = router;

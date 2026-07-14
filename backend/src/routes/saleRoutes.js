const express = require('express');
const { getSales, createSale } = require('../controllers/saleController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'PHARMACIST', 'STORE_MANAGER'), getSales);
router.post('/', authenticate, authorize('ADMIN', 'PHARMACIST'), createSale);

module.exports = router;

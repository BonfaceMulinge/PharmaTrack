const express = require('express');
const { getSales, createSale } = require('../controllers/saleController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'PHARMACIST', 'CASHIER'), getSales);
router.post('/', authenticate, authorize('ADMIN', 'PHARMACIST', 'CASHIER'), createSale);

module.exports = router;

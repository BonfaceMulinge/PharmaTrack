const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getReceipts, getReceipt, getRecentReceipts, getPharmacyProfile, updatePharmacyProfile, uploadLogo, removeLogo } = require('../controllers/receiptController');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'PHARMACIST', 'CASHIER'), getReceipts);
router.get('/recent', authorize('ADMIN', 'PHARMACIST', 'CASHIER'), getRecentReceipts);
router.get('/pharmacy-profile', authorize('ADMIN', 'PHARMACIST', 'CASHIER'), getPharmacyProfile);
router.put('/pharmacy-profile', authorize('ADMIN', 'PHARMACIST'), updatePharmacyProfile);
router.post('/pharmacy-logo', authorize('ADMIN', 'PHARMACIST'), uploadLogo);
router.delete('/pharmacy-logo', authorize('ADMIN', 'PHARMACIST'), removeLogo);
router.get('/:id', authorize('ADMIN', 'PHARMACIST', 'CASHIER'), getReceipt);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getReceipts, getReceipt, getRecentReceipts, getReceiptSummary, archiveReceipt, exportReceipts, getPharmacyProfile, updatePharmacyProfile, uploadLogo, removeLogo } = require('../controllers/receiptController');
const { getPharmacyCode, updatePharmacyCode } = require('../controllers/pharmacyCodeController');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'PHARMACIST', 'CASHIER'), getReceipts);
router.get('/recent', authorize('ADMIN', 'PHARMACIST', 'CASHIER'), getRecentReceipts);
router.get('/summary', authorize('ADMIN', 'PHARMACIST', 'CASHIER'), getReceiptSummary);
router.get('/export', authorize('ADMIN', 'PHARMACIST'), exportReceipts);
router.put('/:id/archive', authorize('ADMIN', 'PHARMACIST'), archiveReceipt);
router.get('/pharmacy-profile', authorize('ADMIN', 'PHARMACIST', 'CASHIER'), getPharmacyProfile);
router.put('/pharmacy-profile', authorize('ADMIN', 'PHARMACIST'), updatePharmacyProfile);
router.post('/pharmacy-logo', authorize('ADMIN', 'PHARMACIST'), uploadLogo);
router.delete('/pharmacy-logo', authorize('ADMIN', 'PHARMACIST'), removeLogo);
router.get('/pharmacy-code', authorize('ADMIN', 'PHARMACIST'), getPharmacyCode);
router.put('/pharmacy-code', authorize('ADMIN', 'PHARMACIST'), updatePharmacyCode);
router.get('/:id', authorize('ADMIN', 'PHARMACIST', 'CASHIER'), getReceipt);

module.exports = router;
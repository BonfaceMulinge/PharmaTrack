const express = require('express');
const { getSuppliers, createSupplier, updateSupplier, deleteSupplier } = require('../controllers/supplierController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'STORE_MANAGER'), getSuppliers);
router.post('/', authenticate, authorize('ADMIN', 'STORE_MANAGER'), createSupplier);
router.put('/:id', authenticate, authorize('ADMIN', 'STORE_MANAGER'), updateSupplier);
router.delete('/:id', authenticate, authorize('ADMIN', 'STORE_MANAGER'), deleteSupplier);

module.exports = router;

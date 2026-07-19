const express = require('express');
const multer = require('multer');
const { getMedicines, createMedicine, importMedicines, getStockMovements, updateMedicine, deleteMedicine, downloadSampleExcel } = require('../controllers/medicineController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/sample-excel', downloadSampleExcel);
router.get('/stock-movements', authenticate, authorize('ADMIN', 'PHARMACIST', 'CASHIER'), getStockMovements);
router.get('/', authenticate, authorize('ADMIN', 'PHARMACIST', 'CASHIER'), getMedicines);
router.post('/', authenticate, authorize('ADMIN'), createMedicine);
router.post('/import', authenticate, authorize('ADMIN'), upload.single('file'), importMedicines);
router.put('/:id', authenticate, authorize('ADMIN'), updateMedicine);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteMedicine);

module.exports = router;

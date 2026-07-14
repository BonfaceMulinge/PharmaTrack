const express = require('express');
const multer = require('multer');
const { getMedicines, createMedicine, importMedicines, updateMedicine, deleteMedicine } = require('../controllers/medicineController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authenticate, authorize('ADMIN', 'PHARMACIST', 'STORE_MANAGER'), getMedicines);
router.post('/', authenticate, authorize('ADMIN', 'STORE_MANAGER'), createMedicine);
router.post('/import', authenticate, authorize('ADMIN', 'STORE_MANAGER'), upload.single('file'), importMedicines);
router.put('/:id', authenticate, authorize('ADMIN', 'STORE_MANAGER'), updateMedicine);
router.delete('/:id', authenticate, authorize('ADMIN', 'STORE_MANAGER'), deleteMedicine);

module.exports = router;

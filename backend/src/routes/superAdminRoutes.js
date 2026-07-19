const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  getDashboardStats,
  getAllPharmacies,
  getPharmacy,
  createPharmacy,
  updatePharmacy,
  suspendPharmacy,
  activatePharmacy,
  deletePharmacy,
  renewSubscription,
  getAllUsers,
  resetUserPassword,
  toggleUserActive,
} = require('../controllers/superAdminController');

const router = express.Router();

const requireSuperAdmin = (req, res, next) => {
  if (!req.user || !req.user.isSuperAdmin) {
    return res.status(403).json({ message: 'Super Admin access required' });
  }
  next();
};

router.use(authenticate);
router.use(requireSuperAdmin);

router.get('/dashboard', getDashboardStats);

router.get('/pharmacies', getAllPharmacies);
router.get('/pharmacies/:id', getPharmacy);
router.post('/pharmacies', createPharmacy);
router.put('/pharmacies/:id', updatePharmacy);
router.post('/pharmacies/:id/suspend', suspendPharmacy);
router.post('/pharmacies/:id/activate', activatePharmacy);
router.delete('/pharmacies/:id', deletePharmacy);
router.post('/pharmacies/:id/renew', renewSubscription);

router.get('/users', getAllUsers);
router.post('/users/:id/reset-password', resetUserPassword);
router.post('/users/:id/toggle-active', toggleUserActive);

module.exports = router;

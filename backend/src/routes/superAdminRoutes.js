const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
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

router.use(authenticate);
router.use(authorize('ADMIN'));

const requireSuperAdmin = (req, res, next) => {
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ message: 'Super Admin access required' });
  }
  next();
};

router.get('/dashboard', requireSuperAdmin, getDashboardStats);

router.get('/pharmacies', requireSuperAdmin, getAllPharmacies);
router.get('/pharmacies/:id', requireSuperAdmin, getPharmacy);
router.post('/pharmacies', requireSuperAdmin, createPharmacy);
router.put('/pharmacies/:id', requireSuperAdmin, updatePharmacy);
router.post('/pharmacies/:id/suspend', requireSuperAdmin, suspendPharmacy);
router.post('/pharmacies/:id/activate', requireSuperAdmin, activatePharmacy);
router.delete('/pharmacies/:id', requireSuperAdmin, deletePharmacy);
router.post('/pharmacies/:id/renew', requireSuperAdmin, renewSubscription);

router.get('/users', requireSuperAdmin, getAllUsers);
router.post('/users/:id/reset-password', requireSuperAdmin, resetUserPassword);
router.post('/users/:id/toggle-active', requireSuperAdmin, toggleUserActive);

module.exports = router;

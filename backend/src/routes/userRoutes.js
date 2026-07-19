const express = require('express');
const { getUsers, createUser, updateUser, deleteUser, resetPassword } = require('../controllers/userController');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireSuperAdmin, getUsers);
router.post('/', authenticate, requireSuperAdmin, createUser);
router.put('/:id', authenticate, requireSuperAdmin, updateUser);
router.delete('/:id', authenticate, requireSuperAdmin, deleteUser);
router.post('/:id/reset-password', authenticate, requireSuperAdmin, resetPassword);

module.exports = router;

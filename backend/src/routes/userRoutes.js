const express = require('express');
const { getUsers, createUser, updateUser, deleteUser, resetPassword } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN'), getUsers);
router.post('/', authenticate, authorize('ADMIN'), createUser);
router.put('/:id', authenticate, authorize('ADMIN'), updateUser);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteUser);
router.post('/:id/reset-password', authenticate, authorize('ADMIN'), resetPassword);

module.exports = router;

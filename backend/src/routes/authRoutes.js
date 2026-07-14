const express = require('express');
const { register, login, refresh, changePassword, getProfile } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/change-password', authenticate, changePassword);
router.get('/me', authenticate, getProfile);

module.exports = router;

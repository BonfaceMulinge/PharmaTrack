const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const signToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, pharmacyId: user.pharmacyId, isSuperAdmin: user.isSuperAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const signRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, pharmacyId: user.pharmacyId, isSuperAdmin: user.isSuperAdmin },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { pharmacy: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({ message: 'Account is locked. Please try again later.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      const failedCount = user.failedLoginCount + 1;
      const lockUntil = failedCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: failedCount, lockedUntil: lockUntil },
      });
      if (lockUntil) {
        return res.status(423).json({ message: 'Account locked due to too many failed attempts. Try again in 15 minutes.' });
      }
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is disabled. Contact your administrator.' });
    }

    if (!user.isSuperAdmin && user.pharmacy) {
      if (user.pharmacy.subscriptionStatus === 'SUSPENDED') {
        return res.status(403).json({ message: 'Pharmacy subscription is suspended. Contact the system administrator.' });
      }
      if (user.pharmacy.subscriptionStatus === 'EXPIRED') {
        return res.status(403).json({ message: 'Pharmacy subscription has expired. Contact the system administrator.' });
      }
    }

    const token = signToken(user);
    const refreshToken = signRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        mustChangePassword: user.mustChangePassword,
        pharmacyId: user.pharmacyId,
        pharmacyName: user.pharmacy?.name || null,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { pharmacy: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const token = signToken(user);
    res.json({ token });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const fullUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!fullUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, fullUser.passwordHash);
    if (!isValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Password change failed' });
  }
};

const getProfile = async (req, res) => {
  const user = req.user;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      isSuperAdmin: user.isSuperAdmin,
      mustChangePassword: user.mustChangePassword,
      pharmacyId: user.pharmacyId,
      pharmacyName: user.pharmacy?.name,
    },
  });
};

module.exports = { login, refresh, changePassword, getProfile };

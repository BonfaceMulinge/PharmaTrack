const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const signToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, pharmacyId: user.pharmacyId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const signRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, pharmacyId: user.pharmacyId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

const register = async (req, res) => {
  try {
    const { pharmacyName, fullName, email, phone, password } = req.body;

    if (!pharmacyName || !fullName || !email || !password) {
      return res.status(400).json({ message: 'Pharmacy name, full name, email, and password are required' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }] },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

    const result = await prisma.$transaction(async (tx) => {
      const pharmacy = await tx.pharmacy.create({
        data: { name: pharmacyName },
      });

      const user = await tx.user.create({
        data: {
          pharmacyId: pharmacy.id,
          email,
          username,
          passwordHash,
          fullName,
          role: 'ADMIN',
          phone: phone || null,
        },
      });

      return { pharmacy, user };
    });

    const token = signToken(result.user);
    const refreshToken = signRefreshToken(result.user);

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        fullName: result.user.fullName,
        role: result.user.role,
        pharmacyId: result.pharmacy.id,
        pharmacyName: result.pharmacy.name,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
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

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    const token = signToken(user);
    const refreshToken = signRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginCount: 0 },
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        pharmacyId: user.pharmacyId,
        pharmacyName: user.pharmacy.name,
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
    const user = req.user;

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

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
      pharmacyId: user.pharmacyId,
      pharmacyName: user.pharmacy?.name,
    },
  });
};

module.exports = { register, login, refresh, changePassword, getProfile };

const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null, pharmacyId: req.pharmacyId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    console.error('[Users] Fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

const createUser = async (req, res) => {
  try {
    const { email, username, password, fullName, role = 'CASHIER', phone } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ message: 'Email, password, and full name are required' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }], deletedAt: null },
    });

    if (existing) {
      return res.status(409).json({ message: 'User with this email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const finalUsername = username || email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

    const user = await prisma.user.create({
      data: {
        pharmacyId: req.pharmacyId,
        email,
        username: finalUsername,
        passwordHash,
        fullName,
        role: role.toUpperCase(),
        phone: phone || null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({ user, message: 'User created successfully' });
  } catch (error) {
    console.error('[Users] Create error:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, role, phone, isActive } = req.body;

    const existing = await prisma.user.findFirst({
      where: { id, pharmacyId: req.pharmacyId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email !== existing.email) {
      const emailTaken = await prisma.user.findFirst({
        where: { email, id: { not: id }, deletedAt: null },
      });
      if (emailTaken) {
        return res.status(409).json({ message: 'Email is already in use' });
      }
    }

    const data = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role.toUpperCase();
    if (phone !== undefined) data.phone = phone || null;
    if (isActive !== undefined) data.isActive = isActive;

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json({ user, message: 'User updated successfully' });
  } catch (error) {
    console.error('[Users] Update error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const existing = await prisma.user.findFirst({
      where: { id, pharmacyId: req.pharmacyId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[Users] Delete error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findFirst({
      where: { id, pharmacyId: req.pharmacyId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('[Users] Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser, resetPassword };

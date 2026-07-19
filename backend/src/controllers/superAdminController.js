const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

const getDashboardStats = async (req, res) => {
  try {
    const [
      totalPharmacies,
      activePharmacies,
      suspendedPharmacies,
      totalUsers,
      totalMedicines,
      totalSales,
    ] = await Promise.all([
      prisma.pharmacy.count({ where: { deletedAt: null } }),
      prisma.pharmacy.count({ where: { deletedAt: null, subscriptionStatus: 'ACTIVE' } }),
      prisma.pharmacy.count({ where: { deletedAt: null, subscriptionStatus: 'SUSPENDED' } }),
      prisma.user.count({ where: { deletedAt: null, isSuperAdmin: false } }),
      prisma.medicine.count({ where: { deletedAt: null } }),
      prisma.sale.count({ where: { deletedAt: null } }),
    ]);

    const recentPharmacies = await prisma.pharmacy.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        users: { where: { deletedAt: null }, select: { id: true } },
        _count: { select: { users: true, medicines: true, sales: true } },
      },
    });

    res.json({
      stats: {
        totalPharmacies,
        activePharmacies,
        suspendedPharmacies,
        totalUsers,
        totalMedicines,
        totalSales,
      },
      recentPharmacies,
    });
  } catch (error) {
    console.error('[SuperAdmin] Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};

const getAllPharmacies = async (req, res) => {
  try {
    const { search, status } = req.query;
    const where = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'ALL') {
      where.subscriptionStatus = status;
    }

    const pharmacies = await prisma.pharmacy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, medicines: true, sales: true } },
      },
    });

    res.json({ pharmacies });
  } catch (error) {
    console.error('[SuperAdmin] Get pharmacies error:', error);
    res.status(500).json({ message: 'Failed to fetch pharmacies' });
  }
};

const getPharmacy = async (req, res) => {
  try {
    const { id } = req.params;
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id },
      include: {
        users: { where: { deletedAt: null }, select: { id: true, fullName: true, email: true, role: true, isActive: true, lastLoginAt: true } },
        _count: { select: { users: true, medicines: true, sales: true } },
      },
    });

    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    res.json({ pharmacy });
  } catch (error) {
    console.error('[SuperAdmin] Get pharmacy error:', error);
    res.status(500).json({ message: 'Failed to fetch pharmacy' });
  }
};

const createPharmacy = async (req, res) => {
  try {
    const { name, ownerName, email, phone, country, password } = req.body;

    if (!name || !ownerName || !email || !password) {
      return res.status(400).json({ message: 'Name, owner name, email, and password are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    const result = await prisma.$transaction(async (tx) => {
      const pharmacy = await tx.pharmacy.create({
        data: {
          name,
          ownerName,
          email,
          phone: phone || null,
          country: country || null,
          subscriptionStatus: 'ACTIVE',
          subscriptionStartDate: now,
          subscriptionExpiryDate: expiryDate,
        },
      });

      const user = await tx.user.create({
        data: {
          pharmacyId: pharmacy.id,
          email,
          username,
          passwordHash,
          fullName: ownerName,
          role: 'ADMIN',
          phone: phone || null,
          mustChangePassword: true,
          country: country || null,
        },
      });

      return { pharmacy, user };
    });

    res.status(201).json({
      message: 'Pharmacy created successfully',
      pharmacy: {
        id: result.pharmacy.id,
        name: result.pharmacy.name,
        ownerName: result.pharmacy.ownerName,
        email: result.pharmacy.email,
        phone: result.pharmacy.phone,
        country: result.pharmacy.country,
        subscriptionStatus: result.pharmacy.subscriptionStatus,
        subscriptionStartDate: result.pharmacy.subscriptionStartDate,
        subscriptionExpiryDate: result.pharmacy.subscriptionExpiryDate,
      },
      adminEmail: result.user.email,
      tempPassword: password,
    });
  } catch (error) {
    console.error('[SuperAdmin] Create pharmacy error:', error);
    res.status(500).json({ message: 'Failed to create pharmacy' });
  }
};

const updatePharmacy = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ownerName, email, phone, country } = req.body;

    const pharmacy = await prisma.pharmacy.findUnique({ where: { id } });
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    const updated = await prisma.pharmacy.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(ownerName && { ownerName }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(country !== undefined && { country }),
      },
    });

    res.json({ pharmacy: updated });
  } catch (error) {
    console.error('[SuperAdmin] Update pharmacy error:', error);
    res.status(500).json({ message: 'Failed to update pharmacy' });
  }
};

const suspendPharmacy = async (req, res) => {
  try {
    const { id } = req.params;
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id } });
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    await prisma.pharmacy.update({
      where: { id },
      data: { subscriptionStatus: 'SUSPENDED' },
    });

    await prisma.user.updateMany({
      where: { pharmacyId: id, deletedAt: null },
      data: { isActive: false },
    });

    res.json({ message: 'Pharmacy suspended successfully' });
  } catch (error) {
    console.error('[SuperAdmin] Suspend pharmacy error:', error);
    res.status(500).json({ message: 'Failed to suspend pharmacy' });
  }
};

const activatePharmacy = async (req, res) => {
  try {
    const { id } = req.params;
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id } });
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    await prisma.pharmacy.update({
      where: { id },
      data: { subscriptionStatus: 'ACTIVE' },
    });

    await prisma.user.updateMany({
      where: { pharmacyId: id, deletedAt: null },
      data: { isActive: true },
    });

    res.json({ message: 'Pharmacy activated successfully' });
  } catch (error) {
    console.error('[SuperAdmin] Activate pharmacy error:', error);
    res.status(500).json({ message: 'Failed to activate pharmacy' });
  }
};

const deletePharmacy = async (req, res) => {
  try {
    const { id } = req.params;
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id } });
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { pharmacyId: id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      await tx.pharmacy.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });

    res.json({ message: 'Pharmacy deleted successfully' });
  } catch (error) {
    console.error('[SuperAdmin] Delete pharmacy error:', error);
    res.status(500).json({ message: 'Failed to delete pharmacy' });
  }
};

const renewSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { months } = req.body;

    if (!months || months < 1) {
      return res.status(400).json({ message: 'Number of months is required' });
    }

    const pharmacy = await prisma.pharmacy.findUnique({ where: { id } });
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    const baseDate = pharmacy.subscriptionExpiryDate && pharmacy.subscriptionExpiryDate > new Date()
      ? pharmacy.subscriptionExpiryDate
      : new Date();

    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + months);

    const updated = await prisma.pharmacy.update({
      where: { id },
      data: {
        subscriptionStatus: 'ACTIVE',
        subscriptionStartDate: pharmacy.subscriptionStartDate || new Date(),
        subscriptionExpiryDate: newExpiry,
      },
    });

    res.json({
      message: `Subscription renewed for ${months} month(s)`,
      subscriptionExpiryDate: updated.subscriptionExpiryDate,
    });
  } catch (error) {
    console.error('[SuperAdmin] Renew subscription error:', error);
    res.status(500).json({ message: 'Failed to renew subscription' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const where = { deletedAt: null, isSuperAdmin: false };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { pharmacy: { select: { id: true, name: true } } },
    });

    const sanitized = users.map(({ passwordHash, tempPasswordHash, ...u }) => u);
    res.json({ users: sanitized });
  } catch (error) {
    console.error('[SuperAdmin] Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    res.json({ message: 'Password reset successfully. User must change password on next login.' });
  } catch (error) {
    console.error('[SuperAdmin] Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

const toggleUserActive = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    res.json({
      message: `User ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: updated.isActive,
    });
  } catch (error) {
    console.error('[SuperAdmin] Toggle user active error:', error);
    res.status(500).json({ message: 'Failed to update user status' });
  }
};

module.exports = {
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
};

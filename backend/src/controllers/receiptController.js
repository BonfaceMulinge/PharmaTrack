const prisma = require('../utils/prisma');

const createReceipt = async (tx, { saleId, pharmacyId, userId, amountPaid, balance, items, subtotal, discount, tax, totalAmount, paymentMethod, receiptNumber }) => {
  return tx.receipt.create({
    data: {
      receiptNumber,
      saleId,
      pharmacyId,
      userId,
      amountPaid,
      balance,
      items: items || [],
      subtotal,
      discount,
      tax,
      totalAmount,
      paymentMethod,
    },
  });
};

const getReceipts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const { search, dateFrom, dateTo, cashierId } = req.query;

    const where = { pharmacyId: req.pharmacyId };

    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { sale: { user: { fullName: { contains: search, mode: 'insensitive' } } } },
        { sale: { user: { email: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (cashierId) {
      where.userId = cashierId;
    }

    const [receipts, total] = await Promise.all([
      prisma.receipt.findMany({
        where,
        select: {
          id: true,
          receiptNumber: true,
          amountPaid: true,
          balance: true,
          subtotal: true,
          discount: true,
          tax: true,
          totalAmount: true,
          paymentMethod: true,
          createdAt: true,
          sale: { select: { id: true, status: true } },
          user: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.receipt.count({ where }),
    ]);

    res.json({ receipts, total, page, limit });
  } catch (error) {
    console.error('[Receipts] Fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch receipts' });
  }
};

const getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await prisma.receipt.findFirst({
      where: {
        OR: [{ id }, { receiptNumber: id }],
        pharmacyId: req.pharmacyId,
      },
      include: {
        sale: {
          select: {
            id: true,
            saleDate: true,
            status: true,
            items: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true,
                totalAmount: true,
                discount: true,
                medicine: { select: { id: true, name: true, category: true } },
              },
            },
            payments: { select: { id: true, amount: true, method: true, referenceNumber: true } },
          },
        },
        pharmacy: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            logo: true,
            licenseNumber: true,
          },
        },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    res.json({ receipt });
  } catch (error) {
    console.error('[Receipts] Get error:', error);
    res.status(500).json({ message: 'Failed to fetch receipt' });
  }
};

const getRecentReceipts = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const receipts = await prisma.receipt.findMany({
      where: { pharmacyId: req.pharmacyId },
      select: {
        id: true,
        receiptNumber: true,
        totalAmount: true,
        paymentMethod: true,
        amountPaid: true,
        balance: true,
        createdAt: true,
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ receipts });
  } catch (error) {
    console.error('[Receipts] Recent error:', error);
    res.status(500).json({ message: 'Failed to fetch recent receipts' });
  }
};

const getPharmacyProfile = async (req, res) => {
  try {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: req.pharmacyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        logo: true,
        licenseNumber: true,
        country: true,
      },
    });

    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    res.json({ pharmacy });
  } catch (error) {
    console.error('[Receipts] Pharmacy profile error:', error);
    res.status(500).json({ message: 'Failed to fetch pharmacy profile' });
  }
};

const updatePharmacyProfile = async (req, res) => {
  try {
    const { name, email, phone, address, logo, licenseNumber, country } = req.body;

    const updated = await prisma.pharmacy.update({
      where: { id: req.pharmacyId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(logo !== undefined && { logo }),
        ...(licenseNumber !== undefined && { licenseNumber }),
        ...(country !== undefined && { country }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        logo: true,
        licenseNumber: true,
        country: true,
      },
    });

    res.json({ pharmacy: updated });
  } catch (error) {
    console.error('[Receipts] Update pharmacy profile error:', error);
    res.status(500).json({ message: 'Failed to update pharmacy profile' });
  }
};

module.exports = { createReceipt, getReceipts, getReceipt, getRecentReceipts, getPharmacyProfile, updatePharmacyProfile };

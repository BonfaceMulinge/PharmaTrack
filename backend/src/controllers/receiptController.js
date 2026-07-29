const path = require('path');
const fs = require('fs');
const multer = require('multer');
const prisma = require('../utils/prisma');

const uploadDir = path.join(__dirname, '../../uploads/logos');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, _file, cb) => cb(null, `${req.pharmacyId}.png`),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG, JPG and JPEG images are allowed'));
  },
});

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
    const { search, dateFrom, dateTo, datePreset, archived } = req.query;

    const where = { pharmacyId: req.pharmacyId };

    if (archived === 'true') {
      where.archived = true;
    } else if (archived === 'false') {
      where.archived = false;
    } else {
      where.archived = false;
    }

    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { sale: { user: { fullName: { contains: search, mode: 'insensitive' } } } },
        { sale: { user: { email: { contains: search, mode: 'insensitive' } } } },
        { sale: { cashierName: { contains: search, mode: 'insensitive' } } },
        { items: { path: '$[*].name', string_contains: search } },
      ];
    }

    if (datePreset) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let start;
      switch (datePreset) {
        case 'today':
          start = todayStart;
          break;
        case 'yesterday': {
          start = new Date(todayStart);
          start.setDate(start.getDate() - 1);
          const end = new Date(todayStart);
          where.createdAt = { gte: start, lt: end };
          break;
        }
        case 'week': {
          start = new Date(todayStart);
          start.setDate(start.getDate() - start.getDay());
          break;
        }
        case 'month': {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        }
        default:
          start = null;
      }
      if (start && !where.createdAt) {
        where.createdAt = { gte: start };
      }
    }

    if (dateFrom || dateTo) {
      where.createdAt = where.createdAt || {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
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
          archived: true,
          sale: { select: { id: true, status: true, cashierName: true } },
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
            cashierName: true,
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
            country: true,
            cashierName: true,
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
      where: { pharmacyId: req.pharmacyId, archived: false },
      select: {
        id: true,
        receiptNumber: true,
        totalAmount: true,
        paymentMethod: true,
        amountPaid: true,
        balance: true,
        createdAt: true,
        sale: { select: { cashierName: true } },
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

const getReceiptSummary = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const [receiptsToday, salesToday, receiptsMonth, salesMonth] = await Promise.all([
      prisma.receipt.count({
        where: { pharmacyId: req.pharmacyId, createdAt: { gte: todayStart, lt: tomorrowStart } },
      }),
      prisma.sale.aggregate({
        where: { pharmacyId: req.pharmacyId, saleDate: { gte: todayStart, lt: tomorrowStart }, deletedAt: null },
        _sum: { totalAmount: true },
      }),
      prisma.receipt.count({
        where: { pharmacyId: req.pharmacyId, createdAt: { gte: monthStart } },
      }),
      prisma.sale.aggregate({
        where: { pharmacyId: req.pharmacyId, saleDate: { gte: monthStart }, deletedAt: null },
        _sum: { totalAmount: true },
      }),
    ]);

    res.json({
      receiptsToday,
      salesToday: salesToday._sum.totalAmount || 0,
      receiptsMonth,
      salesMonth: salesMonth._sum.totalAmount || 0,
    });
  } catch (error) {
    console.error('[Receipts] Summary error:', error);
    res.status(500).json({ message: 'Failed to fetch receipt summary' });
  }
};

const archiveReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await prisma.receipt.findFirst({
      where: { id, pharmacyId: req.pharmacyId },
    });
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    const updated = await prisma.receipt.update({
      where: { id },
      data: { archived: !receipt.archived },
      select: { id: true, archived: true, receiptNumber: true },
    });

    res.json({
      message: `Receipt ${updated.archived ? 'archived' : 'unarchived'} successfully`,
      receipt: updated,
    });
  } catch (error) {
    console.error('[Receipts] Archive error:', error);
    res.status(500).json({ message: 'Failed to archive receipt' });
  }
};

const exportReceipts = async (req, res) => {
  try {
    const { format, search, dateFrom, dateTo, datePreset, archived } = req.query;

    const where = { pharmacyId: req.pharmacyId };

    if (archived === 'true') where.archived = true;
    else if (archived === 'false') where.archived = false;
    else where.archived = false;

    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { sale: { cashierName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (datePreset) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let start;
      switch (datePreset) {
        case 'today': start = todayStart; break;
        case 'yesterday': {
          start = new Date(todayStart);
          start.setDate(start.getDate() - 1);
          const end = new Date(todayStart);
          where.createdAt = { gte: start, lt: end };
          break;
        }
        case 'week': {
          start = new Date(todayStart);
          start.setDate(start.getDate() - start.getDay());
          break;
        }
        case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
      }
      if (start && !where.createdAt) where.createdAt = { gte: start };
    }

    if (dateFrom || dateTo) {
      where.createdAt = where.createdAt || {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const receipts = await prisma.receipt.findMany({
      where,
      select: {
        receiptNumber: true,
        totalAmount: true,
        amountPaid: true,
        balance: true,
        paymentMethod: true,
        createdAt: true,
        sale: { select: { cashierName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = receipts.map((r) => ({
      'Receipt Number': r.receiptNumber,
      Date: new Date(r.createdAt).toLocaleString('en-KE'),
      Cashier: r.sale?.cashierName || '',
      'Total Amount': Number(r.totalAmount).toFixed(2),
      'Amount Paid': Number(r.amountPaid).toFixed(2),
      Balance: Number(r.balance).toFixed(2),
      'Payment Method': r.paymentMethod?.replace('_', ' ') || '',
    }));

    if (format === 'csv') {
      const headers = Object.keys(rows[0] || {});
      const csv = [
        headers.join(','),
        ...rows.map((row) => headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="receipts-export-${Date.now()}.csv"`);
      return res.send(csv);
    }

    if (format === 'xlsx') {
      try {
        const XLSX = require('xlsx');
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Receipts');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="receipts-export-${Date.now()}.xlsx"`);
        return res.send(buf);
      } catch (e) {
        return res.status(400).json({ message: 'XLSX export requires xlsx package. Run: npm install xlsx' });
      }
    }

    res.json({ receipts: rows });
  } catch (error) {
    console.error('[Receipts] Export error:', error);
    res.status(500).json({ message: 'Failed to export receipts' });
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
        cashierName: true,
        pharmacyCode: true,
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
    const { name, email, phone, address, logo, licenseNumber, country, cashierName } = req.body;

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
        ...(cashierName !== undefined && { cashierName }),
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
        cashierName: true,
        pharmacyCode: true,
      },
    });

    res.json({ pharmacy: updated });
  } catch (error) {
    console.error('[Receipts] Update pharmacy profile error:', error);
    res.status(500).json({ message: 'Failed to update pharmacy profile' });
  }
};

const uploadLogo = [
  upload.single('logo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const logoUrl = `/uploads/logos/${req.file.filename}`;
      const updated = await prisma.pharmacy.update({
        where: { id: req.pharmacyId },
        data: { logo: logoUrl },
        select: { id: true, logo: true },
      });
      res.json({ logo: updated.logo, message: 'Logo uploaded successfully' });
    } catch (error) {
      console.error('[Receipts] Logo upload error:', error);
      res.status(500).json({ message: 'Failed to upload logo' });
    }
  },
];

const removeLogo = async (req, res) => {
  try {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: req.pharmacyId },
      select: { logo: true },
    });
    if (pharmacy?.logo) {
      const filePath = path.join(__dirname, '../..', pharmacy.logo);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await prisma.pharmacy.update({
      where: { id: req.pharmacyId },
      data: { logo: null },
    });
    res.json({ message: 'Logo removed successfully' });
  } catch (error) {
    console.error('[Receipts] Logo remove error:', error);
    res.status(500).json({ message: 'Failed to remove logo' });
  }
};

module.exports = { createReceipt, getReceipts, getReceipt, getRecentReceipts, getReceiptSummary, archiveReceipt, exportReceipts, getPharmacyProfile, updatePharmacyProfile, uploadLogo, removeLogo };

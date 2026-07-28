const prisma = require('../utils/prisma');

const getSales = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where: { deletedAt: null, pharmacyId: req.pharmacyId },
        select: {
          id: true,
          pharmacyId: true,
          userId: true,
          saleDate: true,
          totalAmount: true,
          discount: true,
          tax: true,
          paymentMethod: true,
          status: true,
          receiptNumber: true,
          notes: true,
          createdAt: true,
          items: { select: { id: true, medicineId: true, quantity: true, unitPrice: true, totalAmount: true, discount: true } },
          payments: { select: { id: true, amount: true, method: true, referenceNumber: true, status: true } },
          user: { select: { fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sale.count({
        where: { deletedAt: null, pharmacyId: req.pharmacyId },
      }),
    ]);
    res.json({ sales, total, page, limit });
  } catch (error) {
    console.error('[Sales] Fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch sales' });
  }
};

const createSale = async (req, res) => {
  try {
    const { totalAmount, discount, tax, paymentMethod, receiptNumber, items, payments } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const normalizedItems = items.map((item) => ({
      medicineId: item.medicineId,
      quantity: Number(item.quantity || 0),
      unitPrice: parseFloat(item.unitPrice || 0),
      totalAmount: parseFloat(item.totalAmount || 0),
      discount: parseFloat(item.discount || 0),
    }));

    if (normalizedItems.some((item) => !item.medicineId || item.quantity <= 0)) {
      return res.status(400).json({ message: 'Each sale item must include a medicine and quantity greater than zero' });
    }

    const finalReceiptNumber = receiptNumber || `RCPT-${Date.now()}`;

    const sale = await prisma.$transaction(async (tx) => {
      const saleRecord = await tx.sale.create({
        data: {
          pharmacyId: req.pharmacyId,
          userId: req.user.id,
          totalAmount: parseFloat(totalAmount || normalizedItems.reduce((sum, item) => sum + item.totalAmount, 0)),
          discount: parseFloat(discount || 0),
          tax: parseFloat(tax || 0),
          paymentMethod,
          receiptNumber: finalReceiptNumber,
          status: 'COMPLETED',
          items: {
            create: normalizedItems.map((item) => ({
              medicineId: item.medicineId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              discount: item.discount,
            })),
          },
          payments: {
            create: (payments || []).map((payment) => ({
              amount: parseFloat(payment.amount || 0),
              method: payment.method,
              referenceNumber: payment.referenceNumber,
            })),
          },
        },
        include: { items: true, payments: true },
      });

      for (const item of normalizedItems) {
        const medicine = await tx.medicine.findUnique({ where: { id: item.medicineId } });
        if (!medicine) {
          throw Object.assign(new Error(`Medicine not found: ${item.medicineId}`), { statusCode: 400 });
        }

        if (medicine.quantity < item.quantity) {
          throw Object.assign(new Error(`Insufficient stock for ${medicine.name}. Current Stock is ${medicine.quantity}.`), { statusCode: 400 });
        }

        const previousStock = medicine.quantity;
        const remainingQuantity = medicine.quantity - item.quantity;
        await tx.medicine.update({
          where: { id: item.medicineId },
          data: { quantity: remainingQuantity },
        });

        await tx.stockMovement.create({
          data: {
            pharmacyId: req.pharmacyId,
            medicineId: item.medicineId,
            type: 'SALE',
            quantity: item.quantity,
            previousStock,
            balanceAfter: remainingQuantity,
            referenceType: 'Sale',
            referenceId: saleRecord.id,
            notes: `Sold through ${paymentMethod}`,
            userId: req.user?.id || null,
          },
        });

        if (remainingQuantity <= 10) {
          const existingNotif = await tx.notification.findFirst({
            where: {
              pharmacyId: req.pharmacyId,
              type: 'LOW_STOCK',
              deletedAt: null,
              message: { contains: medicine.name },
            },
          });
          if (!existingNotif) {
            await tx.notification.create({
              data: {
                pharmacyId: req.pharmacyId,
                userId: req.user.id,
                type: 'LOW_STOCK',
                title: remainingQuantity <= 0 ? 'Out of Stock' : 'Low Stock Alert',
                message: remainingQuantity <= 0
                  ? `${medicine.name} is out of stock.`
                  : `${medicine.name} has only ${remainingQuantity} unit(s) remaining.`,
              },
            });
          }
        }
      }

      return saleRecord;
    });

    // Fetch the created sale with items and medicine names for receipt
    const fullSale = await prisma.sale.findUnique({
      where: { id: sale.id },
      include: {
        items: { include: { medicine: { select: { name: true, category: true } } } },
        payments: true,
      },
    });

    // Build receipt items snapshot
    const receiptItems = fullSale.items.map((item) => ({
      medicineId: item.medicineId,
      name: item.medicine.name,
      category: item.medicine.category,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.totalAmount),
      discount: Number(item.discount),
    }));

    const saleTotalAmount = Number(fullSale.totalAmount);
    const saleDiscount = Number(fullSale.discount);
    const saleTax = Number(fullSale.tax);
    const subtotal = receiptItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalPaid = fullSale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = totalPaid - saleTotalAmount;

    // Create receipt inside a separate write (after transaction)
    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber: finalReceiptNumber,
        saleId: sale.id,
        pharmacyId: req.pharmacyId,
        userId: req.user.id,
        amountPaid: totalPaid,
        balance: Math.max(0, balance),
        items: receiptItems,
        subtotal,
        discount: saleDiscount,
        tax: saleTax,
        totalAmount: saleTotalAmount,
        paymentMethod,
      },
    });

    return res.status(201).json({
      sale: fullSale,
      receipt,
      receiptNumber: finalReceiptNumber,
      message: 'Sale completed successfully',
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ message: error.message });
    }
    console.error('[Sales] Create error:', error);
    return res.status(500).json({ message: 'Failed to create sale' });
  }
};

module.exports = { getSales, createSale };

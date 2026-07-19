const prisma = require('../utils/prisma');

const getSales = async (_req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      where: { deletedAt: null },
      include: { customer: true, items: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch sales' });
  }
};

const createSale = async (req, res) => {
  try {
    const { customerId, totalAmount, discount, tax, paymentMethod, receiptNumber, items, payments } = req.body;

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
          customerId,
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
          await tx.notification.create({
            data: {
              userId: req.user.id,
              type: 'LOW_STOCK',
              title: 'Low stock alert',
              message: `${medicine.name} is below the reorder threshold.`,
            },
          });
        }
      }

      return saleRecord;
    });

    return res.status(201).json({ sale, receiptNumber: finalReceiptNumber, message: 'Sale completed successfully' });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ message: error.message });
    }

    console.error('[Sales] Create error:', error);
    return res.status(500).json({ message: 'Failed to create sale' });
  }
};

module.exports = { getSales, createSale };

const prisma = require('../utils/prisma');

const getPurchases = async (_req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      where: { deletedAt: null },
      include: { supplier: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch purchases' });
  }
};

const createPurchase = async (req, res) => {
  try {
    const { supplierId, invoiceNumber, totalAmount, items, notes } = req.body;

    const purchase = await prisma.$transaction(async (tx) => {
      const purchaseRecord = await tx.purchase.create({
        data: {
          supplierId,
          userId: req.user.id,
          invoiceNumber,
          totalAmount: parseFloat(totalAmount),
          notes,
          items: {
            create: items.map((item) => ({
              medicineId: item.medicineId,
              quantity: item.quantity,
              costPrice: parseFloat(item.costPrice),
              sellingPrice: parseFloat(item.sellingPrice),
              totalAmount: parseFloat(item.totalAmount),
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of items) {
        let medicine = await tx.medicine.findUnique({ where: { id: item.medicineId } });
        const previousStock = medicine?.quantity ?? 0;

        if (!medicine) {
          medicine = await tx.medicine.create({
            data: {
              name: item.name || 'Unnamed medicine',
              costPrice: parseFloat(item.costPrice || 0),
              sellingPrice: parseFloat(item.sellingPrice || 0),
              quantity: Number(item.quantity || 0),
              category: item.category || 'Other',
            },
          });
        } else {
          const nextStock = medicine.quantity + Number(item.quantity || 0);
          medicine = await tx.medicine.update({
            where: { id: medicine.id },
            data: {
              quantity: nextStock,
              costPrice: parseFloat(item.costPrice || medicine.costPrice),
              sellingPrice: parseFloat(item.sellingPrice || medicine.sellingPrice),
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            medicineId: medicine.id,
            type: 'PURCHASE',
            quantity: Number(item.quantity || 0),
            previousStock,
            balanceAfter: medicine.quantity,
            referenceType: 'Purchase',
            referenceId: purchaseRecord.id,
            notes: `Received stock from ${invoiceNumber}`,
            userId: req.user?.id || null,
          },
        });
      }

      return purchaseRecord;
    });

    res.status(201).json(purchase);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create purchase' });
  }
};

module.exports = { getPurchases, createPurchase };

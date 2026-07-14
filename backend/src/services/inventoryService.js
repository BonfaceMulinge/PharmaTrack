const prisma = require('../utils/prisma');

const defaultLowStockThreshold = 10;

const createLowStockNotification = async (tx, userId, medicine) => {
  if (!medicine) return null;

  const threshold = Number(medicine.reorderLevel ?? defaultLowStockThreshold);
  if (medicine.quantity > threshold) return null;

  return tx.notification.create({
    data: {
      userId,
      type: 'LOW_STOCK',
      title: 'Low stock alert',
      message: `${medicine.name} is at ${medicine.quantity} units and needs restocking.`,
    },
  });
};

const applyStockDelta = async ({
  tx,
  medicineId,
  medicineName,
  delta,
  type,
  userId,
  referenceType,
  referenceId,
  notes,
  costPrice,
  sellingPrice,
  reorderLevel,
}) => {
  const normalizedName = String(medicineName || '').trim();
  const stockDelta = Number(delta || 0);

  if (!medicineId && !normalizedName) {
    throw new Error('Medicine name is required');
  }

  let medicine = null;
  let created = false;

  if (medicineId) {
    medicine = await tx.medicine.findUnique({ where: { id: medicineId } });
  }

  if (!medicine && normalizedName) {
    medicine = await tx.medicine.findFirst({
      where: {
        deletedAt: null,
        name: {
          contains: normalizedName,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  const previousStock = medicine?.quantity ?? 0;
  const nextStock = previousStock + stockDelta;

  if (stockDelta < 0 && nextStock < 0) {
    throw new Error(`Insufficient stock for ${medicine?.name || normalizedName}`);
  }

  if (!medicine) {
    created = true;
    medicine = await tx.medicine.create({
      data: {
        name: normalizedName,
        costPrice: Number(costPrice || 0),
        sellingPrice: Number(sellingPrice || 0),
        quantity: Math.max(nextStock, 0),
        reorderLevel: Number(reorderLevel || defaultLowStockThreshold),
      },
    });
  } else {
    medicine = await tx.medicine.update({
      where: { id: medicine.id },
      data: {
        quantity: nextStock,
        ...(costPrice !== undefined ? { costPrice: Number(costPrice) } : {}),
        ...(sellingPrice !== undefined ? { sellingPrice: Number(sellingPrice) } : {}),
        ...(reorderLevel !== undefined ? { reorderLevel: Number(reorderLevel) } : {}),
      },
    });
  }

  await tx.stockMovement.create({
    data: {
      medicineId: medicine.id,
      type: stockDelta < 0 ? 'SALE' : (type === 'SALE' ? 'SALE' : 'ADJUSTMENT'),
      quantity: Math.abs(stockDelta),
      previousStock,
      balanceAfter: nextStock,
      referenceType: referenceType || 'Inventory',
      referenceId: referenceId || null,
      notes: `${type}: ${notes || 'Inventory update'}`,
      userId: userId || null,
    },
  });

  await createLowStockNotification(tx, userId, medicine);

  return {
    medicine,
    previousStock,
    newStock: nextStock,
    created,
  };
};

module.exports = { applyStockDelta, createLowStockNotification };

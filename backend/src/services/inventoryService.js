const prisma = require('../utils/prisma');

const createLowStockNotification = async (tx, pharmacyId, userId, medicine) => {
  if (!medicine || medicine.quantity > 10) return null;

  return tx.notification.create({
    data: {
      pharmacyId,
      userId,
      type: 'LOW_STOCK',
      title: medicine.quantity <= 0 ? 'Out of Stock' : 'Low Stock Alert',
      message:
        medicine.quantity <= 0
          ? `${medicine.name} is out of stock and cannot be sold until restocked.`
          : `${medicine.name} is at ${medicine.quantity} unit(s) and needs restocking.`,
    },
  });
};

module.exports = { createLowStockNotification };

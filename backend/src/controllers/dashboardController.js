const prisma = require('../utils/prisma');

const getDashboardStats = async (req, res) => {
  try {
    const pharmacyId = req.pharmacyId;
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));

    const [todaysSales, todaysSalesDetails, medicineStats, lowStockCount] = await Promise.all([
      prisma.sale.aggregate({
        where: { deletedAt: null, pharmacyId, saleDate: { gte: startOfToday } },
        _sum: { totalAmount: true },
        _count: true,
      }),

      prisma.sale.findMany({
        where: { deletedAt: null, pharmacyId, saleDate: { gte: startOfToday } },
        select: {
          id: true,
          receiptNumber: true,
          totalAmount: true,
          createdAt: true,
          items: { select: { medicineId: true, unitPrice: true, quantity: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      prisma.medicine.findMany({
        where: { deletedAt: null, pharmacyId },
        select: { id: true, quantity: true, costPrice: true },
      }),

      prisma.medicine.count({
        where: { deletedAt: null, pharmacyId, quantity: { gt: 0, lte: 10 } },
      }),
    ]);

    const totalMedicines = medicineStats.length;

    const medicineMap = new Map(medicineStats.map((m) => [m.id, m]));

    let inventoryValue = 0;
    for (const m of medicineStats) {
      inventoryValue += Number(m.costPrice) * m.quantity;
    }

    const todaysRevenue = Number(todaysSales._sum.totalAmount || 0);
    const todaysTransactions = todaysSales._count || 0;

    let todayProfit = 0;
    for (const sale of todaysSalesDetails) {
      for (const item of sale.items) {
        const med = medicineMap.get(item.medicineId);
        if (med) {
          todayProfit += (Number(item.unitPrice) - Number(med.costPrice)) * item.quantity;
        }
      }
    }

    const recentActivity = todaysSalesDetails.map((sale) => ({
      id: sale.id,
      title: 'Sale completed',
      detail: `Receipt ${sale.receiptNumber} \u2022 ${sale.items.length} item(s)`,
      amount: Number(sale.totalAmount),
      time: sale.createdAt,
    }));

    res.json({
      totalMedicines,
      inventoryValue,
      todaysRevenue,
      todaysTransactions,
      lowStockCount,
      todayProfit,
      recentActivity,
    });
  } catch (error) {
    console.error('[Dashboard] Stats error:', error);
    res.status(500).json({ message: 'Failed to load dashboard stats' });
  }
};

module.exports = { getDashboardStats };

const prisma = require('../utils/prisma');

const getDashboardStats = async (req, res) => {
  try {
    const pharmacyId = req.pharmacyId;
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));

    const [todaysSalesAggregate, todaysSalesDetails, medicineAgg, lowStockCount, totalMedicines] = await Promise.all([
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

      prisma.medicine.aggregate({
        where: { deletedAt: null, pharmacyId },
        _sum: { costPrice: true, quantity: true },
        _count: true,
      }),

      prisma.medicine.count({
        where: { deletedAt: null, pharmacyId, quantity: { gt: 0, lte: 10 } },
      }),

      prisma.medicine.count({
        where: { deletedAt: null, pharmacyId },
      }),
    ]);

    const todaysRevenue = Number(todaysSalesAggregate._sum.totalAmount || 0);
    const todaysTransactions = todaysSalesAggregate._count || 0;
    const totalUnitsInStock = medicineAgg._sum.quantity || 0;
    const totalMedicineCount = totalMedicines;

    const outOfStock = await prisma.medicine.count({
      where: { deletedAt: null, pharmacyId, quantity: { lte: 0 } },
    });

    const inventoryValueResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM("costPrice" * "quantity"), 0) as "inventoryValue"
      FROM "Medicine"
      WHERE "deletedAt" IS NULL AND "pharmacyId" = ${pharmacyId}
    `;
    const inventoryValue = Number(inventoryValueResult[0]?.inventoryValue || 0);

    let todayProfit = 0;
    if (todaysSalesDetails.length > 0) {
      const medicineIds = [...new Set(todaysSalesDetails.flatMap((s) => s.items.map((i) => i.medicineId)))];
      if (medicineIds.length > 0) {
        const medicines = await prisma.medicine.findMany({
          where: { id: { in: medicineIds } },
          select: { id: true, costPrice: true },
        });
        const costMap = new Map(medicines.map((m) => [m.id, Number(m.costPrice)]));
        for (const sale of todaysSalesDetails) {
          for (const item of sale.items) {
            const costPrice = costMap.get(item.medicineId) || 0;
            todayProfit += (Number(item.unitPrice) - costPrice) * item.quantity;
          }
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
      totalMedicines: totalMedicineCount,
      totalUnitsInStock,
      outOfStock,
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

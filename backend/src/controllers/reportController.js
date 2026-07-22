const prisma = require('../utils/prisma');

const getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const pharmacyId = req.pharmacyId;

    const [
      todaySalesAggregate,
      monthlySalesAggregate,
      medicineStats,
      recentSales,
      topSelling,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: { deletedAt: null, pharmacyId, saleDate: { gte: startOfToday } },
        _sum: { totalAmount: true, discount: true, tax: true },
        _count: true,
      }),

      prisma.sale.aggregate({
        where: { deletedAt: null, pharmacyId, saleDate: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),

      prisma.medicine.findMany({
        where: { deletedAt: null, pharmacyId },
        select: { id: true, name: true, quantity: true, costPrice: true },
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

      prisma.saleItem.groupBy({
        by: ['medicineId'],
        where: { deletedAt: null, sale: { deletedAt: null, pharmacyId, saleDate: { gte: startOfMonth } } },
        _sum: { quantity: true, totalAmount: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const totalMedicines = medicineStats.length;

    let lowStock = 0;
    let outOfStock = 0;
    let inventoryValue = 0;
    let totalStockUnits = 0;
    const medicineMap = new Map(medicineStats.map((m) => [m.id, m]));

    for (const m of medicineStats) {
      totalStockUnits += m.quantity;
      inventoryValue += Number(m.costPrice) * m.quantity;
      if (m.quantity > 0 && m.quantity <= 10) lowStock++;
      if (m.quantity <= 0) outOfStock++;
    }

    const todayRevenue = Number(todaySalesAggregate._sum.totalAmount || 0);
    const todayTransactions = todaySalesAggregate._count || 0;
    const monthlyRevenue = Number(monthlySalesAggregate._sum.totalAmount || 0);

    let todayProfit = 0;
    for (const sale of recentSales) {
      for (const item of sale.items) {
        const med = medicineMap.get(item.medicineId);
        if (med) {
          todayProfit += (Number(item.unitPrice) - Number(med.costPrice)) * item.quantity;
        }
      }
    }

    const medicineNameMap = new Map(medicineStats.map((m) => [m.id, m.name]));

    const topSellingMedicines = topSelling
      .map((entry) => ({
        name: medicineNameMap.get(entry.medicineId) || 'Unknown',
        qty: entry._sum.quantity || 0,
        revenue: Number(entry._sum.totalAmount || 0),
      }))
      .filter((entry) => entry.qty > 0);

    const recentActivity = recentSales.map((sale) => ({
      id: sale.id,
      title: 'Sale completed',
      detail: `Receipt ${sale.receiptNumber} \u2022 ${sale.items.length} item(s)`,
      amount: Number(sale.totalAmount),
      time: sale.createdAt,
    }));

    res.json({
      sales: totalSales,
      medicines: totalMedicines,
      lowStock,
      outOfStock,
      totalUnitsInStock: totalStockUnits,
      todayRevenue,
      todayTransactions,
      todayProfit,
      monthlyRevenue,
      inventoryValue,
      topSellingMedicines,
      recentActivity,
    });
  } catch (error) {
    console.error('[Reports] Analytics error:', error);
    res.status(500).json({ message: 'Failed to load analytics' });
  }
};

module.exports = { getAnalytics };

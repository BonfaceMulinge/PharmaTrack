const prisma = require('../utils/prisma');

const getAnalytics = async (_req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalSales,
      todaySalesAggregate,
      monthlySalesAggregate,
      totalMedicines,
      medicineRows,
      inventoryAggregate,
      recentSales,
      topSelling,
    ] = await Promise.all([
      prisma.sale.count({ where: { deletedAt: null } }),

      prisma.sale.aggregate({
        where: { deletedAt: null, saleDate: { gte: startOfToday } },
        _sum: { totalAmount: true },
        _count: true,
      }),

      prisma.sale.aggregate({
        where: { deletedAt: null, saleDate: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),

      prisma.medicine.count({ where: { deletedAt: null } }),

      prisma.medicine.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, quantity: true, costPrice: true, sellingPrice: true },
      }),

      prisma.medicine.aggregate({
        where: { deletedAt: null },
        _sum: { quantity: true },
      }),

      prisma.sale.findMany({
        where: { deletedAt: null, saleDate: { gte: startOfToday } },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      prisma.saleItem.groupBy({
        by: ['medicineId'],
        where: { deletedAt: null, sale: { deletedAt: null, saleDate: { gte: startOfMonth } } },
        _sum: { quantity: true, totalAmount: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const lowStock = medicineRows.filter((m) => m.quantity > 0 && m.quantity <= 10).length;
    const outOfStock = medicineRows.filter((m) => m.quantity <= 0).length;

    const inventoryValue = medicineRows.reduce((sum, m) => {
      return sum + Number(m.costPrice) * m.quantity;
    }, 0);

    const todayRevenue = Number(todaySalesAggregate._sum.totalAmount || 0);
    const todayTransactions = todaySalesAggregate._count || 0;
    const monthlyRevenue = Number(monthlySalesAggregate._sum.totalAmount || 0);

    const medicineMap = new Map(medicineRows.map((m) => [m.id, m.name]));

    const topSellingMedicines = topSelling
      .map((entry) => ({
        name: medicineMap.get(entry.medicineId) || 'Unknown',
        qty: entry._sum.quantity || 0,
        revenue: Number(entry._sum.totalAmount || 0),
      }))
      .filter((entry) => entry.qty > 0);

    const recentActivity = recentSales.map((sale) => ({
      id: sale.id,
      title: 'Sale completed',
      detail: `Receipt ${sale.receiptNumber} • ${sale.items.length} item(s)`,
      amount: Number(sale.totalAmount),
      time: sale.createdAt,
    }));

    res.json({
      sales: totalSales,
      medicines: totalMedicines,
      lowStock,
      outOfStock,
      totalUnitsInStock: inventoryAggregate._sum.quantity || 0,
      todayRevenue,
      todayTransactions,
      monthlyRevenue,
      revenue: todayRevenue,
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

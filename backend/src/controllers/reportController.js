const prisma = require('../utils/prisma');

const getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const pharmacyId = req.pharmacyId;

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
      prisma.sale.count({ where: { deletedAt: null, pharmacyId } }),

      prisma.sale.aggregate({
        where: { deletedAt: null, pharmacyId, saleDate: { gte: startOfToday } },
        _sum: { totalAmount: true, discount: true, tax: true },
        _count: true,
      }),

      prisma.sale.aggregate({
        where: { deletedAt: null, pharmacyId, saleDate: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),

      prisma.medicine.count({ where: { deletedAt: null, pharmacyId } }),

      prisma.medicine.findMany({
        where: { deletedAt: null, pharmacyId },
        select: { id: true, name: true, quantity: true, costPrice: true, sellingPrice: true },
      }),

      prisma.medicine.aggregate({
        where: { deletedAt: null, pharmacyId },
        _sum: { quantity: true },
      }),

      prisma.sale.findMany({
        where: { deletedAt: null, pharmacyId, saleDate: { gte: startOfToday } },
        include: { items: true },
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

    const lowStock = medicineRows.filter((m) => m.quantity > 0 && m.quantity <= 10).length;
    const outOfStock = medicineRows.filter((m) => m.quantity <= 0).length;

    const inventoryValue = medicineRows.reduce((sum, m) => {
      return sum + Number(m.costPrice) * m.quantity;
    }, 0);

    const totalStockUnits = inventoryAggregate._sum.quantity || 0;

    const todayRevenue = Number(todaySalesAggregate._sum.totalAmount || 0);
    const todayDiscount = Number(todaySalesAggregate._sum.discount || 0);
    const todayTax = Number(todaySalesAggregate._sum.tax || 0);
    const todayTransactions = todaySalesAggregate._count || 0;
    const monthlyRevenue = Number(monthlySalesAggregate._sum.totalAmount || 0);

    let todayProfit = 0;
    if (recentSales.length > 0) {
      const saleIds = recentSales.map((s) => s.id);
      const allSaleItems = await prisma.saleItem.findMany({
        where: { saleId: { in: saleIds }, deletedAt: null },
      });
      const medicineMap = new Map(medicineRows.map((m) => [m.id, m]));
      for (const item of allSaleItems) {
        const med = medicineMap.get(item.medicineId);
        if (med) {
          todayProfit += (Number(item.unitPrice) - Number(med.costPrice)) * item.quantity;
        }
      }
    }

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

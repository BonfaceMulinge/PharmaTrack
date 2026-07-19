const prisma = require('../utils/prisma');
const XLSX = require('xlsx');

const VALID_CATEGORIES = ['Tablets', 'Capsules', 'Syrup', 'Injection', 'Cream', 'Drops', 'Other'];

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toPositiveStock = (value) => Math.max(Math.trunc(toNumber(value, 0)), 0);

const validateCategory = (category) => {
  if (!category) return 'Other';
  const trimmed = String(category).trim();
  const match = VALID_CATEGORIES.find((c) => c.toLowerCase() === trimmed.toLowerCase());
  return match || 'Other';
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const safeUserId = (userId) => (userId && UUID_RE.test(userId) ? userId : null);

const createStockMovement = async (tx, { pharmacyId, medicine, previousStock, quantity, type, referenceType, referenceId, notes, userId }) => {
  return tx.stockMovement.create({
    data: {
      pharmacyId,
      medicineId: medicine.id,
      type,
      quantity,
      previousStock,
      balanceAfter: medicine.quantity,
      referenceType,
      referenceId: referenceId || medicine.id,
      notes,
      userId: safeUserId(userId),
    },
  });
};

const serializeMedicine = (medicine) => ({
  id: medicine.id,
  name: medicine.name,
  quantity: medicine.quantity,
  costPrice: medicine.costPrice,
  sellingPrice: medicine.sellingPrice,
  category: medicine.category,
  inventoryValue: Number(medicine.costPrice) * medicine.quantity,
  createdAt: medicine.createdAt,
  updatedAt: medicine.updatedAt,
});

const getMedicines = async (req, res) => {
  try {
    const medicines = await prisma.medicine.findMany({
      where: { deletedAt: null, pharmacyId: req.pharmacyId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(medicines.map(serializeMedicine));
  } catch (error) {
    console.error('[Medicines] Fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch medicines' });
  }
};

const createMedicine = async (req, res) => {
  const name = String(req.body.name || '').trim();
  const initialStock = toPositiveStock(req.body.initialStock ?? 0);
  const costPrice = req.body.costPrice === '' || req.body.costPrice === undefined ? 0 : toNumber(req.body.costPrice, 0);
  const sellingPrice = req.body.sellingPrice === '' || req.body.sellingPrice === undefined ? 0 : toNumber(req.body.sellingPrice, 0);
  const category = validateCategory(req.body.category);

  try {
    if (!name) {
      return res.status(400).json({ message: 'Medicine name is required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let medicine = await tx.medicine.findFirst({
        where: {
          deletedAt: null,
          pharmacyId: req.pharmacyId,
          name: { equals: name, mode: 'insensitive' },
        },
      });

      if (!medicine) {
        medicine = await tx.medicine.create({
          data: {
            pharmacyId: req.pharmacyId,
            name,
            costPrice,
            sellingPrice,
            quantity: initialStock,
            category,
          },
        });

        if (initialStock > 0) {
          await createStockMovement(tx, {
            pharmacyId: req.pharmacyId,
            medicine,
            previousStock: 0,
            quantity: initialStock,
            type: 'ADJUSTMENT',
            referenceType: 'Manual Entry',
            notes: 'Medicine created with initial stock',
            userId: req.user?.id,
          });
        }

        return { medicine, created: true, message: `Medicine created. Current Stock is now ${medicine.quantity}.` };
      }

      const previousStock = medicine.quantity;
      const nextStock = previousStock + initialStock;

      medicine = await tx.medicine.update({
        where: { id: medicine.id },
        data: { quantity: nextStock, costPrice, sellingPrice, category },
      });

      if (initialStock > 0) {
        await createStockMovement(tx, {
          pharmacyId: req.pharmacyId,
          medicine,
          previousStock,
          quantity: initialStock,
          type: 'ADJUSTMENT',
          referenceType: 'Manual Entry',
          notes: 'Stock added to existing medicine',
          userId: req.user?.id,
        });
      }

      return { medicine, created: false, message: `Medicine updated. Current Stock is now ${medicine.quantity}.` };
    });

    res.status(result.created ? 201 : 200).json({
      medicine: serializeMedicine(result.medicine),
      message: result.message,
      created: result.created,
    });
  } catch (error) {
    console.error('[Medicines] Create error:', error);
    res.status(500).json({ message: 'Failed to create medicine' });
  }
};

const normalizeHeaders = (row) => {
  const normalized = {};
  Object.keys(row).forEach((key) => {
    normalized[key.trim()] = row[key];
  });
  return normalized;
};

const resolveColumn = (row, ...candidates) => {
  for (const candidate of candidates) {
    if (row[candidate] !== undefined && row[candidate] !== '') return row[candidate];
  }
  return undefined;
};

const importMedicines = async (req, res) => {
  const aggregatedRows = new Map();
  const rowErrors = [];

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    const rows = rawRows.map(normalizeHeaders);

    const summary = {
      totalRows: rows.length,
      created: 0,
      updated: 0,
      totalUnitsAdded: 0,
      failedRows: 0,
      errors: [],
    };

    rows.forEach((rawRow, index) => {
      const rowNumber = index + 2;
      const row = normalizeHeaders(rawRow);

      const name = resolveColumn(row, 'Medicine Name', 'MedicineName', 'medicineName', 'name', 'Name');
      const stockRaw = resolveColumn(row, 'Available Stock', 'AvailableStock', 'Stock', 'stock', 'Quantity', 'quantity');
      const costPriceRaw = resolveColumn(row, 'Cost Price', 'CostPrice', 'costPrice');
      const sellingPriceRaw = resolveColumn(row, 'Selling Price', 'SellingPrice', 'sellingPrice');
      const categoryRaw = resolveColumn(row, 'Category', 'category');

      if (!name || !String(name).trim()) {
        rowErrors.push({ row: rowNumber, message: 'Medicine Name is required' });
        return;
      }

      const stock = toNumber(stockRaw, NaN);
      if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
        rowErrors.push({ row: rowNumber, message: `Available Stock must be a whole number (received: "${stockRaw}")` });
        return;
      }

      const costPrice = toNumber(costPriceRaw, NaN);
      if (!Number.isFinite(costPrice) || costPrice < 0) {
        rowErrors.push({ row: rowNumber, message: `Cost Price must be a valid number (received: "${costPriceRaw}")` });
        return;
      }

      const sellingPrice = toNumber(sellingPriceRaw, NaN);
      if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
        rowErrors.push({ row: rowNumber, message: `Selling Price must be a valid number (received: "${sellingPriceRaw}")` });
        return;
      }

      const category = String(categoryRaw || '').trim();
      if (!category) {
        rowErrors.push({ row: rowNumber, message: 'Category is required' });
        return;
      }

      const nameStr = String(name).trim();
      const key = nameStr.toLowerCase();
      if (aggregatedRows.has(key)) {
        const existing = aggregatedRows.get(key);
        existing.stock += Math.trunc(stock);
        existing.costPrice = costPrice;
        existing.sellingPrice = sellingPrice;
        existing.category = validateCategory(category);
      } else {
        aggregatedRows.set(key, {
          name: nameStr,
          stock: Math.trunc(stock),
          costPrice,
          sellingPrice,
          category: validateCategory(category),
          rowIndex: rowNumber,
        });
      }
    });

    if (rowErrors.length > 0) {
      summary.failedRows = rowErrors.length;
      summary.errors = rowErrors;
    }

    if (aggregatedRows.size === 0) {
      return res.status(400).json({ message: 'No valid rows to import', summary });
    }

    for (const item of aggregatedRows.values()) {
      try {
        await prisma.$transaction(async (tx) => {
          let medicine = await tx.medicine.findFirst({
            where: {
              deletedAt: null,
              pharmacyId: req.pharmacyId,
              name: { equals: item.name, mode: 'insensitive' },
            },
          });

          if (!medicine) {
            medicine = await tx.medicine.create({
              data: {
                pharmacyId: req.pharmacyId,
                name: item.name,
                costPrice: item.costPrice,
                sellingPrice: item.sellingPrice,
                quantity: item.stock,
                category: item.category,
              },
            });
            summary.created += 1;
            summary.totalUnitsAdded += item.stock;
            await createStockMovement(tx, {
              pharmacyId: req.pharmacyId,
              medicine,
              previousStock: 0,
              quantity: item.stock,
              type: 'ADJUSTMENT',
              referenceType: 'Import',
              notes: 'Imported - new medicine created',
              userId: req.user?.id,
            });
          } else {
            const previousStock = medicine.quantity;
            const nextStock = previousStock + item.stock;
            medicine = await tx.medicine.update({
              where: { id: medicine.id },
              data: {
                quantity: nextStock,
                costPrice: item.costPrice,
                sellingPrice: item.sellingPrice,
                category: item.category,
              },
            });
            summary.updated += 1;
            summary.totalUnitsAdded += item.stock;
            await createStockMovement(tx, {
              pharmacyId: req.pharmacyId,
              medicine,
              previousStock,
              quantity: item.stock,
              type: 'ADJUSTMENT',
              referenceType: 'Import',
              notes: 'Imported - stock increased',
              userId: req.user?.id,
            });
          }
        });
      } catch (err) {
        summary.failedRows += 1;
        summary.errors.push({ row: item.rowIndex, message: err.message });
      }
    }

    await prisma.notification.create({
      data: {
        pharmacyId: req.pharmacyId,
        type: 'IMPORT_COMPLETED',
        title: 'Import Completed',
        message: `Import finished: ${summary.created} created, ${summary.updated} updated, ${summary.totalUnitsAdded} units added.`,
      },
    });

    res.json({ message: 'Import completed', summary });
  } catch (error) {
    console.error('[Import] Fatal error:', error);
    res.status(500).json({ message: 'Failed to import medicines' });
  }
};

const updateMedicine = async (req, res) => {
  try {
    const medicine = await prisma.$transaction(async (tx) => {
      const existing = await tx.medicine.findFirst({
        where: { id: req.params.id, pharmacyId: req.pharmacyId, deletedAt: null },
      });
      if (!existing) {
        throw Object.assign(new Error('Medicine not found'), { statusCode: 404 });
      }

      const name = req.body.name !== undefined ? String(req.body.name || '').trim() : undefined;
      if (name !== undefined && !name) {
        throw Object.assign(new Error('Medicine name cannot be empty'), { statusCode: 400 });
      }

      const data = {};
      if (name !== undefined) data.name = name;
      if (req.body.costPrice !== undefined && req.body.costPrice !== '') {
        data.costPrice = toNumber(req.body.costPrice, 0);
      }
      if (req.body.sellingPrice !== undefined && req.body.sellingPrice !== '') {
        data.sellingPrice = toNumber(req.body.sellingPrice, 0);
      }
      if (req.body.category !== undefined) {
        data.category = validateCategory(req.body.category);
      }

      return tx.medicine.update({ where: { id: req.params.id }, data });
    });

    res.json(serializeMedicine(medicine));
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ message: error.message });
    if (error.statusCode === 400) return res.status(400).json({ message: error.message });
    res.status(500).json({ message: 'Failed to update medicine' });
  }
};

const getStockMovements = async (req, res) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      where: { deletedAt: null, pharmacyId: req.pharmacyId },
      include: { medicine: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(
      movements.map((movement) => ({
        id: movement.id,
        medicineName: movement.medicine?.name || 'Unknown',
        type: movement.type,
        quantity: movement.quantity,
        previousStock: movement.previousStock,
        balanceAfter: movement.balanceAfter,
        referenceType: movement.referenceType,
        notes: movement.notes,
        userName: movement.user?.fullName || movement.user?.username || 'System',
        createdAt: movement.createdAt,
      }))
    );
  } catch (error) {
    console.error('[Medicines] Stock movements error:', error);
    res.status(500).json({ message: 'Failed to fetch stock movements' });
  }
};

const deleteMedicine = async (req, res) => {
  try {
    const existing = await prisma.medicine.findFirst({
      where: { id: req.params.id, pharmacyId: req.pharmacyId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    await prisma.medicine.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Medicine deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete medicine' });
  }
};

const downloadSampleExcel = async (_req, res) => {
  try {
    const sampleData = [
      ['Medicine Name', 'Available Stock', 'Cost Price', 'Selling Price', 'Category'],
      ['Paracetamol 500mg', 100, 5, 10, 'Tablets'],
      ['Amoxicillin 250mg', 50, 12, 20, 'Capsules'],
      ['Ibuprofen 400mg', 75, 8, 15, 'Tablets'],
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
    worksheet['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Medicines');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=medicines-sample.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate sample file' });
  }
};

module.exports = {
  getMedicines,
  createMedicine,
  importMedicines,
  updateMedicine,
  getStockMovements,
  deleteMedicine,
  downloadSampleExcel,
  VALID_CATEGORIES,
};

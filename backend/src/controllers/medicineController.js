const prisma = require('../utils/prisma');
const XLSX = require('xlsx');

const demoMedicines = [
  {
    id: 'demo-1',
    name: 'Paracetamol',
    quantity: 30,
    costPrice: 5,
    sellingPrice: 10,
    reorderLevel: 10,
    createdAt: new Date(),
  },
  {
    id: 'demo-2',
    name: 'Amoxicillin',
    quantity: 18,
    costPrice: 12,
    sellingPrice: 18,
    reorderLevel: 10,
    createdAt: new Date(),
  },
];

const demoMovements = [];
const DEFAULT_LOW_STOCK_THRESHOLD = 10;

const isDemoMode = () => process.env.NODE_ENV !== 'production';

const serializeMedicine = (medicine) => ({ ...medicine, currentStock: medicine.quantity });

const getDemoMedicines = () => demoMedicines.map(serializeMedicine);

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toPositiveStock = (value) => Math.max(Math.trunc(toNumber(value, 0)), 0);

const addDemoMovement = (medicineId, medicineName, delta, type, notes) => {
  const medicine = demoMedicines.find((item) => item.id === medicineId) || demoMedicines.find((item) => item.name === medicineName);
  if (!medicine) return;

  const previousStock = medicine.quantity;
  const nextStock = previousStock + delta;
  medicine.quantity = Math.max(nextStock, 0);

  demoMovements.push({
    id: `${Date.now()}-${demoMovements.length}`,
    medicineId: medicine.id,
    medicineName: medicine.name,
    type,
    transactionType: notes?.includes('Import') ? 'Import' : type,
    quantity: Math.abs(delta),
    previousStock,
    balanceAfter: medicine.quantity,
    newStock: medicine.quantity,
    newCurrentStock: medicine.quantity,
    notes,
    createdAt: new Date(),
  });
};

const createStockMovement = async (tx, { medicine, previousStock, quantity, type, referenceType, referenceId, notes, userId }) => {
  return tx.stockMovement.create({
    data: {
      medicineId: medicine.id,
      type,
      quantity,
      previousStock,
      balanceAfter: medicine.quantity,
      referenceType,
      referenceId: referenceId || medicine.id,
      notes,
      userId: userId || null,
    },
  });
};

const createLowStockNotification = async (tx, userId, medicine) => {
  const threshold = Number(medicine.reorderLevel ?? DEFAULT_LOW_STOCK_THRESHOLD);
  if (medicine.quantity > threshold) return;

  await tx.notification.create({
    data: {
      userId: userId || null,
      type: 'LOW_STOCK',
      title: medicine.quantity <= 0 ? 'Out of stock alert' : 'Low stock alert',
      message:
        medicine.quantity <= 0
          ? `${medicine.name} is out of stock and cannot be sold until restocked.`
          : `${medicine.name} is at ${medicine.quantity} units and needs restocking.`,
    },
  });
};

const serializeMovement = (movement) => {
  const isRemoval = movement.type === 'SALE';
  const previousStock =
    movement.previousStock ??
    (isRemoval ? Number(movement.balanceAfter || 0) + Number(movement.quantity || 0) : Number(movement.balanceAfter || 0) - Number(movement.quantity || 0));

  return {
    ...movement,
    medicineName: movement.medicine?.name || movement.medicineName,
    transactionType: movement.referenceType || movement.type,
    previousStock,
    newCurrentStock: movement.balanceAfter,
    userName: movement.user?.fullName || movement.user?.username || 'System',
  };
};

const getMedicines = async (_req, res) => {
  try {
    const medicines = await prisma.medicine.findMany({
      where: { deletedAt: null },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(medicines.map((medicine) => ({ ...medicine, currentStock: medicine.quantity })));
  } catch (error) {
    if (isDemoMode()) {
      return res.json(getDemoMedicines());
    }
    res.status(500).json({ message: 'Failed to fetch medicines' });
  }
};

const createMedicine = async (req, res) => {
  const name = String(req.body.name || '').trim();
  const initialStock = toPositiveStock(req.body.initialStock ?? req.body.quantity ?? 0);
  const costPrice = req.body.costPrice === '' || req.body.costPrice === undefined ? 0 : toNumber(req.body.costPrice, 0);
  const sellingPrice = req.body.sellingPrice === '' || req.body.sellingPrice === undefined ? 0 : toNumber(req.body.sellingPrice, 0);
  const reorderLevel = req.body.reorderLevel ? toPositiveStock(req.body.reorderLevel) : DEFAULT_LOW_STOCK_THRESHOLD;
  try {
    if (!name) {
      return res.status(400).json({ message: 'Medicine name is required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let medicine = await tx.medicine.findFirst({
        where: {
          deletedAt: null,
          name: {
            equals: name,
            mode: 'insensitive',
          },
        },
      });

      if (!medicine) {
        const previousStock = 0;
        medicine = await tx.medicine.create({
          data: {
            name,
            costPrice,
            sellingPrice,
            quantity: initialStock,
            reorderLevel,
          },
        });

        await createStockMovement(tx, {
          medicine,
          previousStock,
          quantity: initialStock,
          type: 'ADJUSTMENT',
          referenceType: 'Manual Entry',
          notes: 'Manual stock entry created medicine',
          userId: req.user?.id,
        });

        return {
          medicine,
          created: true,
          message: `${initialStock} units added successfully. Current Stock is now ${medicine.quantity}.`,
        };
      }

      const previousStock = medicine.quantity;
      const nextStock = previousStock + initialStock;

      medicine = await tx.medicine.update({
        where: { id: medicine.id },
        data: {
          quantity: nextStock,
          costPrice: req.body.costPrice === '' || req.body.costPrice === undefined ? medicine.costPrice : costPrice,
          sellingPrice: req.body.sellingPrice === '' || req.body.sellingPrice === undefined ? medicine.sellingPrice : sellingPrice,
          reorderLevel,
        },
      });

      await createStockMovement(tx, {
        medicine,
        previousStock,
        quantity: initialStock,
        type: 'ADJUSTMENT',
        referenceType: 'Manual Entry',
        notes: 'Manual stock entry increased existing stock',
        userId: req.user?.id,
      });

      return {
        medicine,
        created: false,
        message: `${initialStock} units added successfully. Current Stock is now ${medicine.quantity}.`,
      };
    });

    res.status(result.created ? 201 : 200).json({
      medicine: result.medicine,
      message: result.message,
      created: result.created,
    });
  } catch (error) {
    if (isDemoMode()) {
      const matchingMedicine = demoMedicines.find((item) => item.name.toLowerCase() === name.toLowerCase());
      if (matchingMedicine) {
        matchingMedicine.quantity += initialStock;
        addDemoMovement(matchingMedicine.id, matchingMedicine.name, initialStock, 'ADJUSTMENT', 'Manual stock entry');
        return res.status(200).json({
          medicine: serializeMedicine(matchingMedicine),
          message: `${initialStock} units added successfully. Current Stock is now ${matchingMedicine.quantity}.`,
          created: false,
        });
      }

      const newMedicine = {
        id: `demo-${demoMedicines.length + 1}`,
        name,
        quantity: initialStock,
        costPrice,
        sellingPrice,
        reorderLevel,
        createdAt: new Date(),
      };
      demoMedicines.push(newMedicine);
      addDemoMovement(newMedicine.id, newMedicine.name, initialStock, 'ADJUSTMENT', 'Manual stock entry');
      return res.status(201).json({
        medicine: serializeMedicine(newMedicine),
        message: `${initialStock} units added successfully. Current Stock is now ${newMedicine.quantity}.`,
        created: true,
      });
    }

    res.status(500).json({ message: 'Failed to create medicine' });
  }
};

const importMedicines = async (req, res) => {
  const aggregatedRows = new Map();
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    const summary = {
      newMedicines: 0,
      updatedMedicines: 0,
      totalUnitsAdded: 0,
      errors: 0,
    };

    rows.forEach((row, index) => {
      const name = String(row['Medicine Name'] || row.medicineName || row.Medicine || row.name || '').trim();
      if (!name) {
        summary.errors += 1;
        return;
      }

      const stock = toNumber(row.Stock || row.stock || row['Initial Stock'] || row.quantity, NaN);
      const costPrice = toNumber(row['Cost Price'] || row.costPrice, 0);
      const sellingPrice = toNumber(row['Selling Price'] || row.sellingPrice, 0);

      if (!Number.isFinite(stock) || stock < 0) {
        summary.errors += 1;
        return;
      }

      const key = name.toLowerCase();
      const existing = aggregatedRows.get(key) || {
        name,
        stock: 0,
        costPrice,
        sellingPrice,
        rowIndex: index,
      };

      existing.stock += Math.trunc(stock);
      existing.costPrice = existing.costPrice || costPrice;
      existing.sellingPrice = existing.sellingPrice || sellingPrice;
      aggregatedRows.set(key, existing);
    });

    await prisma.$transaction(async (tx) => {
      for (const item of aggregatedRows.values()) {
        try {
          const stockAdded = toPositiveStock(item.stock);
          let medicine = await tx.medicine.findFirst({
            where: {
              deletedAt: null,
              name: {
                equals: item.name,
                mode: 'insensitive',
              },
            },
          });

          if (!medicine) {
            const previousStock = 0;
            medicine = await tx.medicine.create({
              data: {
                name: item.name,
                costPrice: item.costPrice,
                sellingPrice: item.sellingPrice,
                quantity: stockAdded,
                reorderLevel: DEFAULT_LOW_STOCK_THRESHOLD,
              },
            });
            summary.newMedicines += 1;
            await createStockMovement(tx, {
              medicine,
              previousStock,
              quantity: stockAdded,
              type: 'ADJUSTMENT',
              referenceType: 'Import',
              notes: 'Imported stock created medicine',
              userId: req.user?.id,
            });
          } else {
            const previousStock = medicine.quantity;
            const nextStock = previousStock + stockAdded;
            medicine = await tx.medicine.update({
              where: { id: medicine.id },
              data: {
                quantity: nextStock,
                costPrice: item.costPrice || medicine.costPrice,
                sellingPrice: item.sellingPrice || medicine.sellingPrice,
              },
            });
            summary.updatedMedicines += 1;
            await createStockMovement(tx, {
              medicine,
              previousStock,
              quantity: stockAdded,
              type: 'ADJUSTMENT',
              referenceType: 'Import',
              notes: 'Imported stock increased existing stock',
              userId: req.user?.id,
            });
          }

          summary.totalUnitsAdded += stockAdded;
        } catch (error) {
          summary.errors += 1;
        }
      }
    });

    res.json({
      message: 'Import completed',
      summary,
      imported: aggregatedRows.size,
    });
  } catch (error) {
    if (isDemoMode()) {
      const summary = { newMedicines: 0, updatedMedicines: 0, totalUnitsAdded: 0, errors: 0 };
      for (const item of aggregatedRows.values()) {
        const stockAdded = toPositiveStock(item.stock);
        const existing = demoMedicines.find((medicine) => medicine.name.toLowerCase() === item.name.toLowerCase());
        if (existing) {
          existing.quantity += stockAdded;
          summary.updatedMedicines += 1;
          summary.totalUnitsAdded += stockAdded;
          addDemoMovement(existing.id, existing.name, stockAdded, 'ADJUSTMENT', 'Import stock');
        } else {
          demoMedicines.push({
            id: `demo-${demoMedicines.length + 1}`,
            name: item.name,
            quantity: stockAdded,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            reorderLevel: DEFAULT_LOW_STOCK_THRESHOLD,
            createdAt: new Date(),
          });
          summary.newMedicines += 1;
          summary.totalUnitsAdded += stockAdded;
          addDemoMovement(demoMedicines.at(-1).id, item.name, stockAdded, 'ADJUSTMENT', 'Import stock');
        }
      }
      return res.json({ message: 'Import completed', summary, imported: aggregatedRows.size });
    }

    res.status(500).json({ message: 'Failed to import medicines' });
  }
};

const updateMedicine = async (req, res) => {
  try {
    const replaceStock = req.body.replaceStock === true || req.body.stockMode === 'REPLACE';
    const requestedStock = req.body.currentStock ?? req.body.quantity;

    const medicine = await prisma.$transaction(async (tx) => {
      const existing = await tx.medicine.findUnique({ where: { id: req.params.id } });
      if (!existing || existing.deletedAt) {
        throw Object.assign(new Error('Medicine not found'), { statusCode: 404 });
      }

      const { quantity, currentStock, initialStock, replaceStock: _replaceStock, stockMode, ...safeBody } = req.body;
      const data = {
        ...safeBody,
        costPrice: req.body.costPrice !== undefined && req.body.costPrice !== '' ? toNumber(req.body.costPrice) : undefined,
        sellingPrice: req.body.sellingPrice !== undefined && req.body.sellingPrice !== '' ? toNumber(req.body.sellingPrice) : undefined,
        reorderLevel: req.body.reorderLevel !== undefined && req.body.reorderLevel !== '' ? toPositiveStock(req.body.reorderLevel) : undefined,
      };

      Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);

      if (replaceStock && requestedStock !== undefined) {
        data.quantity = toPositiveStock(requestedStock);
      }

      const updated = await tx.medicine.update({
        where: { id: req.params.id },
        data,
      });

      if (replaceStock && requestedStock !== undefined) {
        await createStockMovement(tx, {
          medicine: updated,
          previousStock: existing.quantity,
          quantity: Math.abs(updated.quantity - existing.quantity),
          type: 'ADJUSTMENT',
          referenceType: 'Adjustment',
          notes: 'Stock replaced by user adjustment',
          userId: req.user?.id,
        });
        await createLowStockNotification(tx, req.user?.id, updated);
      }

      return updated;
    });

    res.json(serializeMedicine(medicine));
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to update medicine' });
  }
};

const getStockMovements = async (_req, res) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      where: { deletedAt: null },
      include: { medicine: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json(movements.map(serializeMovement));
  } catch (error) {
    if (isDemoMode()) {
      return res.json(demoMovements.slice(0, 20).map(serializeMovement));
    }
    res.status(500).json({ message: 'Failed to fetch stock movements' });
  }
};

const deleteMedicine = async (req, res) => {
  try {
    await prisma.medicine.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Medicine deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete medicine' });
  }
};

module.exports = { getMedicines, createMedicine, importMedicines, getStockMovements, updateMedicine, deleteMedicine };

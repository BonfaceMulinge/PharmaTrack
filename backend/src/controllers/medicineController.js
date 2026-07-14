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

const isDemoMode = () => process.env.NODE_ENV !== 'production';

const serializeMedicine = (medicine) => ({ ...medicine, currentStock: medicine.quantity });

const getDemoMedicines = () => demoMedicines.map(serializeMedicine);

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
    quantity: Math.abs(delta),
    previousStock,
    newStock: medicine.quantity,
    notes,
    createdAt: new Date(),
  });
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
  const initialStock = Number(req.body.initialStock ?? req.body.quantity ?? 0);
  const costPrice = req.body.costPrice === '' || req.body.costPrice === undefined ? 0 : Number(req.body.costPrice || 0);
  const sellingPrice = req.body.sellingPrice === '' || req.body.sellingPrice === undefined ? 0 : Number(req.body.sellingPrice || 0);
  const reorderLevel = req.body.reorderLevel ? Number(req.body.reorderLevel) : 10;
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
        medicine = await tx.medicine.create({
          data: {
            name,
            costPrice,
            sellingPrice,
            quantity: Math.max(initialStock, 0),
            reorderLevel,
          },
        });

        await tx.stockMovement.create({
          data: {
            medicineId: medicine.id,
            type: 'ADJUSTMENT',
            quantity: Math.max(initialStock, 0),
            balanceAfter: medicine.quantity,
            referenceType: 'Manual Entry',
            referenceId: medicine.id,
            notes: 'Manual stock entry created medicine',
            userId: req.user?.id || null,
          },
        });

        return {
          medicine,
          created: true,
          message: `${Math.max(initialStock, 0)} units added successfully. Current Stock is now ${medicine.quantity}.`,
        };
      }

      const previousStock = medicine.quantity;
      const nextStock = previousStock + Math.max(initialStock, 0);

      medicine = await tx.medicine.update({
        where: { id: medicine.id },
        data: {
          quantity: nextStock,
          costPrice,
          sellingPrice,
          reorderLevel,
        },
      });

      await tx.stockMovement.create({
        data: {
          medicineId: medicine.id,
          type: 'ADJUSTMENT',
          quantity: Math.max(initialStock, 0),
          balanceAfter: medicine.quantity,
          referenceType: 'Manual Entry',
          referenceId: medicine.id,
          notes: 'Manual stock entry increased existing stock',
        },
      });

      return {
        medicine,
        created: false,
        message: `${Math.max(initialStock, 0)} units added successfully. Current Stock is now ${medicine.quantity}.`,
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
        const previousStock = matchingMedicine.quantity;
        matchingMedicine.quantity += Math.max(initialStock, 0);
        addDemoMovement(matchingMedicine.id, matchingMedicine.name, Math.max(initialStock, 0), 'ADJUSTMENT', 'Manual stock entry');
        return res.status(200).json({
          medicine: serializeMedicine(matchingMedicine),
          message: `${Math.max(initialStock, 0)} units added successfully. Current Stock is now ${matchingMedicine.quantity}.`,
          created: false,
        });
      }

      const newMedicine = {
        id: `demo-${demoMedicines.length + 1}`,
        name,
        quantity: Math.max(initialStock, 0),
        costPrice,
        sellingPrice,
        reorderLevel,
        createdAt: new Date(),
      };
      demoMedicines.push(newMedicine);
      addDemoMovement(newMedicine.id, newMedicine.name, Math.max(initialStock, 0), 'ADJUSTMENT', 'Manual stock entry');
      return res.status(201).json({
        medicine: serializeMedicine(newMedicine),
        message: `${Math.max(initialStock, 0)} units added successfully. Current Stock is now ${newMedicine.quantity}.`,
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

    rows.forEach((row, index) => {
      const name = String(row['Medicine Name'] || row.medicineName || row.Medicine || row.name || '').trim();
      if (!name) return;

      const stock = Number(row.Stock || row.stock || row['Initial Stock'] || row.quantity || 0);
      const costPrice = Number(row['Cost Price'] || row.costPrice || 0);
      const sellingPrice = Number(row['Selling Price'] || row.sellingPrice || 0);

      const existing = aggregatedRows.get(name) || {
        name,
        stock: 0,
        costPrice,
        sellingPrice,
        rowIndex: index,
      };

      existing.stock += Number.isFinite(stock) ? stock : 0;
      existing.costPrice = existing.costPrice || costPrice;
      existing.sellingPrice = existing.sellingPrice || sellingPrice;
      aggregatedRows.set(name, existing);
    });

    const summary = {
      newMedicines: 0,
      updatedMedicines: 0,
      totalUnitsAdded: 0,
      errors: 0,
    };

    await prisma.$transaction(async (tx) => {
      for (const item of aggregatedRows.values()) {
        try {
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
            medicine = await tx.medicine.create({
              data: {
                name: item.name,
                costPrice: item.costPrice,
                sellingPrice: item.sellingPrice,
                quantity: Math.max(item.stock, 0),
                reorderLevel: 10,
              },
            });
            summary.newMedicines += 1;
          } else {
            const previousStock = medicine.quantity;
            const nextStock = previousStock + Math.max(item.stock, 0);
            medicine = await tx.medicine.update({
              where: { id: medicine.id },
              data: {
                quantity: nextStock,
                costPrice: item.costPrice || medicine.costPrice,
                sellingPrice: item.sellingPrice || medicine.sellingPrice,
              },
            });
            summary.updatedMedicines += 1;
          }

          summary.totalUnitsAdded += Math.max(item.stock, 0);

          await tx.stockMovement.create({
            data: {
              medicineId: medicine.id,
              type: 'ADJUSTMENT',
              quantity: Math.max(item.stock, 0),
              balanceAfter: medicine.quantity,
              referenceType: 'Import',
              referenceId: medicine.id,
              notes: 'Imported stock',
              userId: req.user?.id || null,
            },
          });
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
        const existing = demoMedicines.find((medicine) => medicine.name.toLowerCase() === item.name.toLowerCase());
        if (existing) {
          const previousStock = existing.quantity;
          existing.quantity += Math.max(item.stock, 0);
          summary.updatedMedicines += 1;
          summary.totalUnitsAdded += Math.max(item.stock, 0);
          addDemoMovement(existing.id, existing.name, Math.max(item.stock, 0), 'ADJUSTMENT', 'Imported stock');
        } else {
          demoMedicines.push({
            id: `demo-${demoMedicines.length + 1}`,
            name: item.name,
            quantity: Math.max(item.stock, 0),
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            reorderLevel: 10,
            createdAt: new Date(),
          });
          summary.newMedicines += 1;
          summary.totalUnitsAdded += Math.max(item.stock, 0);
          addDemoMovement(demoMedicines.at(-1).id, item.name, Math.max(item.stock, 0), 'ADJUSTMENT', 'Imported stock');
        }
      }
      return res.json({ message: 'Import completed', summary, imported: aggregatedRows.size });
    }

    res.status(500).json({ message: 'Failed to import medicines' });
  }
};

const updateMedicine = async (req, res) => {
  try {
    const medicine = await prisma.medicine.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        costPrice: req.body.costPrice ? parseFloat(req.body.costPrice) : undefined,
        sellingPrice: req.body.sellingPrice ? parseFloat(req.body.sellingPrice) : undefined,
      },
    });

    res.json(medicine);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update medicine' });
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

module.exports = { getMedicin
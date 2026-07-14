const prisma = require('../utils/prisma');

const getSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch suppliers' });
  }
};

const createSupplier = async (req, res) => {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create supplier' });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update supplier' });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    await prisma.supplier.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete supplier' });
  }
};

module.exports = { getSuppliers, createSupplier, updateSupplier, deleteSupplier };

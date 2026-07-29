const prisma = require('../utils/prisma');
const { generatePharmacyCode, ensureUniqueCode } = require('../utils/pharmacyCode');

const getPharmacyCode = async (req, res) => {
  try {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: req.pharmacyId },
      select: { pharmacyCode: true },
    });
    res.json({ pharmacyCode: pharmacy?.pharmacyCode || null });
  } catch (error) {
    console.error('[PharmacyCode] Get error:', error);
    res.status(500).json({ message: 'Failed to fetch pharmacy code' });
  }
};

const updatePharmacyCode = async (req, res) => {
  try {
    const { pharmacyCode } = req.body;
    if (!pharmacyCode || typeof pharmacyCode !== 'string') {
      return res.status(400).json({ message: 'Pharmacy code is required' });
    }

    const code = pharmacyCode.trim().toUpperCase();
    if (code.length < 2 || code.length > 6) {
      return res.status(400).json({ message: 'Pharmacy code must be between 2 and 6 characters' });
    }

    const duplicate = await prisma.pharmacy.findFirst({
      where: { pharmacyCode: code, id: { not: req.pharmacyId }, deletedAt: null },
    });
    if (duplicate) {
      return res.status(409).json({ message: 'Pharmacy Code already exists. Please choose another code.' });
    }

    const updated = await prisma.pharmacy.update({
      where: { id: req.pharmacyId },
      data: { pharmacyCode: code },
      select: { pharmacyCode: true },
    });

    res.json({ pharmacyCode: updated.pharmacyCode, message: 'Pharmacy code updated successfully' });
  } catch (error) {
    console.error('[PharmacyCode] Update error:', error);
    res.status(500).json({ message: 'Failed to update pharmacy code' });
  }
};

module.exports = { getPharmacyCode, updatePharmacyCode };

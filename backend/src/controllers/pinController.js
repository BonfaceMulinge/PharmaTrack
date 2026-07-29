const prisma = require('../utils/prisma');

const verifyPin = async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: 'Invalid PIN format' });
    }

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: req.pharmacyId },
      select: { pin: true },
    });

    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    if (pharmacy.pin !== pin) {
      return res.status(401).json({ message: 'Invalid Admin PIN' });
    }

    res.json({ verified: true, message: 'PIN verified successfully' });
  } catch (error) {
    console.error('[PIN] Verify error:', error);
    res.status(500).json({ message: 'PIN verification failed' });
  }
};

const getPharmacyPin = async (req, res) => {
  try {
    const { id } = req.params;

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id },
      select: { pin: true, name: true },
    });

    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    res.json({ pharmacyId: id, name: pharmacy.name, pin: pharmacy.pin });
  } catch (error) {
    console.error('[PIN] Get pharmacy PIN error:', error);
    res.status(500).json({ message: 'Failed to fetch pharmacy PIN' });
  }
};

const updatePharmacyPin = async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;

    if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: 'PIN must be exactly 4 digits' });
    }

    const pharmacy = await prisma.pharmacy.findUnique({ where: { id } });
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    const updated = await prisma.pharmacy.update({
      where: { id },
      data: { pin },
      select: { id: true, name: true, pin: true },
    });

    res.json({ pharmacy: updated, message: 'PIN updated successfully' });
  } catch (error) {
    console.error('[PIN] Update error:', error);
    res.status(500).json({ message: 'Failed to update PIN' });
  }
};

const resetPharmacyPin = async (req, res) => {
  try {
    const { id } = req.params;

    const pharmacy = await prisma.pharmacy.findUnique({ where: { id } });
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    const updated = await prisma.pharmacy.update({
      where: { id },
      data: { pin: '3923' },
      select: { id: true, name: true, pin: true },
    });

    res.json({ pharmacy: updated, message: 'PIN reset to default successfully' });
  } catch (error) {
    console.error('[PIN] Reset error:', error);
    res.status(500).json({ message: 'Failed to reset PIN' });
  }
};

module.exports = { verifyPin, getPharmacyPin, updatePharmacyPin, resetPharmacyPin };

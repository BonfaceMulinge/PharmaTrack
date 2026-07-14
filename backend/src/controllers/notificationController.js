const prisma = require('../utils/prisma');

const demoNotifications = [
  {
    id: 'demo-1',
    title: 'Low stock alert',
    message: 'Paracetamol is below the reorder threshold.',
    type: 'LOW_STOCK',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Expiring soon',
    message: 'Amoxicillin batch 2024-09 is expiring in 10 days.',
    type: 'EXPIRED_MEDICINE',
    createdAt: new Date().toISOString(),
  },
];

const getNotifications = async (_req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (notifications.length > 0) {
      return res.json(notifications);
    }

    return res.json(demoNotifications);
  } catch (error) {
    return res.json(demoNotifications);
  }
};

const createNotification = async (req, res) => {
  try {
    const notification = await prisma.notification.create({ data: req.body });
    res.status(201).json(notification);
  } catch (error) {
    res.status(201).json({ ...req.body, id: `demo-${Date.now()}` });
  }
};

module.exports = { getNotifications, createNotification };

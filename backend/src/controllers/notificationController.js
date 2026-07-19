const prisma = require('../utils/prisma');

const getNotifications = async (_req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json(notifications);
  } catch (error) {
    console.error('[Notifications] Fetch error:', error);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

const createNotification = async (req, res) => {
  try {
    const notification = await prisma.notification.create({ data: req.body });
    res.status(201).json(notification);
  } catch (error) {
    console.error('[Notifications] Create error:', error);
    res.status(500).json({ message: 'Failed to create notification' });
  }
};

module.exports = { getNotifications, createNotification };

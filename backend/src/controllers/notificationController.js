const prisma = require('../utils/prisma');

const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { deletedAt: null, pharmacyId: req.pharmacyId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json(notifications);
  } catch (error) {
    console.error('[Notifications] Fetch error:', error);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.deleteMany({
      where: { id, pharmacyId: req.pharmacyId },
    });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('[Notifications] Delete error:', error);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.deleteMany({
      where: { pharmacyId: req.pharmacyId, isRead: false },
    });
    res.json({ message: 'All notifications deleted' });
  } catch (error) {
    console.error('[Notifications] Delete all error:', error);
    res.status(500).json({ message: 'Failed to delete notifications' });
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };

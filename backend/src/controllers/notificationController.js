const prisma = require('../utils/prisma');

const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { deletedAt: null, pharmacyId: req.pharmacyId },
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
    await prisma.notification.updateMany({
      where: { id, pharmacyId: req.pharmacyId },
      data: { isRead: true },
    });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('[Notifications] Mark read error:', error);
    res.status(500).json({ message: 'Failed to mark notification' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { pharmacyId: req.pharmacyId, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('[Notifications] Mark all read error:', error);
    res.status(500).json({ message: 'Failed to mark notifications' });
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };

const { Notification } = require('../models');
const logger = require('../utils/logger');

/**
 * GET /api/notifications
 * Get the current user's notifications.
 */
exports.getNotifications = async (req, res) => {
  try {
    const { type, isRead } = req.query;
    const where = { userId: req.user.id };

    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead === 'true';

    const notifications = await Notification.findAll({
      where,
      include: [
        { association: 'relatedTask', attributes: ['id', 'title', 'status', 'deadline'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    const unreadCount = await Notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    logger.error(`GetNotifications error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    await notification.update({ isRead: true });
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    logger.error(`MarkAsRead error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the current user.
 */
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );

    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    logger.error(`MarkAllAsRead error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * DELETE /api/notifications/:id
 * Dismiss (delete) a notification.
 */
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    await notification.destroy();
    res.json({ message: 'Notification dismissed.' });
  } catch (error) {
    logger.error(`DeleteNotification error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

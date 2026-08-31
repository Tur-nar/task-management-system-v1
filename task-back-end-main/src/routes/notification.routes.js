const router = require('express').Router();
const controller = require('../controllers/notification.controller');
const auth = require('../middlewares/auth');

// GET /api/notifications — Authenticated (own notifications)
router.get('/', auth, controller.getNotifications);

// PATCH /api/notifications/read-all — Authenticated (must be before /:id)
router.patch('/read-all', auth, controller.markAllAsRead);

// PATCH /api/notifications/:id/read — Authenticated
router.patch('/:id/read', auth, controller.markAsRead);

// DELETE /api/notifications/:id — Authenticated
router.delete('/:id', auth, controller.deleteNotification);

module.exports = router;

const { Op } = require('sequelize');
const { User, Notification } = require('../models');
const { sendNotificationEmail } = require('./email.service');
const logger = require('../utils/logger');

async function getSuperAdminIds() {
  const admins = await User.findAll({
    where: { role: { [Op.in]: ['super_admin', 'admin'] }, status: 'active' },
    attributes: ['id'],
  });
  return admins.map((a) => a.id);
}

/**
 * Look up users by their IDs and send notification emails in parallel.
 * Fire-and-forget — errors are logged but never thrown.
 */
async function sendEmailsToUsers(userIds, payload) {
  try {
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id', 'email', 'firstName'],
    });

    const emailPromises = users.map((user) => {
      const resolved = typeof payload === 'function'
        ? payload(user)
        : payload;

      return sendNotificationEmail({
        recipientEmail: user.email,
        recipientName: user.firstName,
        title: resolved.title,
        message: resolved.message,
        severity: resolved.severity || 'info',
        type: resolved.type || 'general',
        taskTitle: resolved.taskTitle,
        taskDeadline: resolved.taskDeadline,
      });
    });

    // Fire all emails in parallel — don't await for speed
    Promise.allSettled(emailPromises).catch(() => {});
  } catch (error) {
    logger.error(`sendEmailsToUsers error: ${error.message}`);
  }
}

async function notifyUsers(userIds, payload) {
  const unique = [...new Set((userIds || []).filter(Boolean))];
  if (unique.length === 0) return;
  await Notification.bulkCreate(unique.map((userId) => ({ ...payload, userId })));

  // Send email notifications in parallel (fire-and-forget)
  sendEmailsToUsers(unique, payload);
}

async function notifySuperAdmins(payload, { exclude = [] } = {}) {
  const ids = await getSuperAdminIds();
  const excludeSet = new Set((exclude || []).filter(Boolean));
  const filtered = ids.filter((id) => !excludeSet.has(id));
  await notifyUsers(filtered, payload);
}

/**
 * Fan out a notification to everyone involved with a task:
 *   assignee, assigner, assignee's supervisor, and all super admins.
 * Pass `exclude` to omit specific user IDs (typically the actor).
 *
 * If `payload` is a function, it's called per-recipient with a role hint
 * ('assignee' | 'assigner' | 'supervisor' | 'super_admin') so the message
 * can be tailored. Otherwise the same payload is used for all.
 */
async function notifyTaskParties(task, { exclude = [], payload }) {
  const excludeSet = new Set((exclude || []).filter(Boolean));
  const supervisorId = task.assignee?.supervisorId ?? null;
  const superAdminIds = await getSuperAdminIds();

  const roleMap = new Map();
  const addRecipient = (id, role) => {
    if (!id || excludeSet.has(id) || roleMap.has(id)) return;
    roleMap.set(id, role);
  };

  addRecipient(task.assignedToId, 'assignee');
  addRecipient(task.assignedById, 'assigner');
  addRecipient(supervisorId, 'supervisor');
  superAdminIds.forEach((id) => addRecipient(id, 'super_admin'));

  const entries = [...roleMap.entries()];
  if (entries.length === 0) return;

  const rows = entries.map(([userId, role]) => {
    const resolved = typeof payload === 'function' ? payload(role) : payload;
    return { ...resolved, userId };
  });
  await Notification.bulkCreate(rows);

  // Send email notifications (fire-and-forget)
  const recipientIds = entries.map(([userId]) => userId);
  const emailPayloadFn = typeof payload === 'function'
    ? (user) => {
        const role = roleMap.get(user.id) || 'general';
        return typeof payload === 'function' ? payload(role) : payload;
      }
    : payload;
  sendEmailsToUsers(recipientIds, emailPayloadFn);
}

/**
 * Find an existing deadline warning for a task sent within the last 24h,
 * across assignee, supervisor, or super admins. Used for hourly-cron dedupe.
 */
async function findRecentDeadlineWarning(task, since) {
  const supervisorId = task.assignee?.supervisorId ?? null;
  const superAdminIds = await getSuperAdminIds();
  const userIds = [task.assignedToId, supervisorId, ...superAdminIds].filter(Boolean);
  if (userIds.length === 0) return null;
  return Notification.findOne({
    where: {
      userId: { [Op.in]: userIds },
      relatedTaskId: task.id,
      type: 'deadline_warning',
      createdAt: { [Op.gt]: since },
    },
  });
}

module.exports = {
  getSuperAdminIds,
  notifyUsers,
  notifySuperAdmins,
  notifyTaskParties,
  findRecentDeadlineWarning,
};

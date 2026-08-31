const { TaskComment, Task } = require('../models');
const logger = require('../utils/logger');
const { notifyUsers, getSuperAdminIds } = require('../services/notification.service');

const AUTHOR_ATTRS = { association: 'author', attributes: ['id', 'firstName', 'lastName', 'role'] };

/**
 * GET /api/tasks/:taskId/comments
 * Returns comments as a nested tree (supports unlimited reply depth),
 * ordered oldest-first at every level.
 */
exports.getComments = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    if (req.user.role === 'staff' && task.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Fetch all comments for this task flat (avoids Sequelize nested-include
    // alias collisions on self-referencing associations), then nest in JS.
    const rows = await TaskComment.findAll({
      where: { taskId: req.params.taskId },
      include: [AUTHOR_ATTRS],
      order: [['createdAt', 'ASC']],
    });

    const map = new Map();
    rows.forEach((row) => {
      const c = row.toJSON();
      c.replies = [];
      map.set(c.id, c);
    });

    const top = [];
    map.forEach((c) => {
      if (c.parentCommentId && map.has(c.parentCommentId)) {
        map.get(c.parentCommentId).replies.push(c);
      } else {
        top.push(c);
      }
    });

    res.json({ comments: top });
  } catch (error) {
    logger.error(`GetComments: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * POST /api/tasks/:taskId/comments
 * Body: { content, parentCommentId? }
 * All authenticated users with task access can comment.
 */
exports.createComment = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.taskId, {
      include: [{ association: 'assignee', attributes: ['id', 'supervisorId'] }],
    });
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    if (req.user.role === 'staff' && task.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { content, parentCommentId } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required.' });
    }

    // Validate parent exists if provided
    let parent = null;
    if (parentCommentId) {
      parent = await TaskComment.findOne({
        where: { id: parentCommentId, taskId: req.params.taskId },
      });
      if (!parent) return res.status(404).json({ error: 'Parent comment not found.' });
    }

    const comment = await TaskComment.create({
      content: content.trim(),
      taskId: req.params.taskId,
      userId: req.user.id,
      parentCommentId: parentCommentId || null,
    });

    // Fan out notifications to everyone involved with the task (excluding the commenter)
    const superAdminIds = await getSuperAdminIds();
    const recipients = [
      task.assignedToId,
      task.assignedById,
      task.assignee?.supervisorId,
      parent?.userId,
      ...superAdminIds,
    ];
    const actor = req.user.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : req.user.email;
    const preview = content.trim().length > 100 ? `${content.trim().slice(0, 100)}…` : content.trim();
    await notifyUsers(
      recipients.filter((id) => id && id !== req.user.id),
      {
        title: parent ? 'New Reply on Task' : 'New Comment on Task',
        message: `${actor} commented on "${task.title}": ${preview}`,
        type: 'general',
        severity: 'info',
        relatedTaskId: task.id,
      },
    );

    const full = await TaskComment.findByPk(comment.id, { include: [AUTHOR_ATTRS] });
    res.status(201).json({ comment: full });
  } catch (error) {
    logger.error(`CreateComment: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * DELETE /api/tasks/:taskId/comments/:id
 * Own comment or super_admin only.
 */
exports.deleteComment = async (req, res) => {
  try {
    const comment = await TaskComment.findOne({
      where: { id: req.params.id, taskId: req.params.taskId },
    });
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });

    if (comment.userId !== req.user.id && req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own comments.' });
    }

    await comment.destroy();
    res.json({ message: 'Comment deleted.' });
  } catch (error) {
    logger.error(`DeleteComment: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

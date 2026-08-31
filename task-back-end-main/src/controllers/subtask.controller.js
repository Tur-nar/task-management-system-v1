const { SubTask, Task, Notification } = require('../models');
const logger = require('../utils/logger');
const { calculatePerformance } = require('../services/performance.service');
const { notifySuperAdmins } = require('../services/notification.service');

async function getTask(taskId, userId, userRole) {
  const task = await Task.findByPk(taskId);
  if (!task) return { error: 'Task not found.', status: 404 };
  if (userRole === 'staff' && task.assignedToId !== userId) {
    return { error: 'Access denied.', status: 403 };
  }
  return { task };
}

/**
 * Sync the parent task status with its sub-tasks.
 * - Any sub-task completed & task is not_started  → in_progress
 * - All sub-tasks completed (≥1 total)            → completed (or completed_late if was overdue)
 * - No sub-tasks completed & task is in_progress  → not_started
 *
 * Returns the (possibly updated) task row.
 */
async function syncTaskStatusFromSubTasks(task, actingUser) {
  const subtasks = await SubTask.findAll({ where: { taskId: task.id } });
  if (subtasks.length === 0) return task;

  const total = subtasks.length;
  const done = subtasks.filter((s) => s.isCompleted).length;

  let newStatus = task.status;
  let becameCompleted = false;

  if (done === total) {
    if (task.status === 'overdue') newStatus = 'completed_late';
    else if (task.status !== 'completed' && task.status !== 'completed_late') newStatus = 'completed';
    if (newStatus === 'completed' || newStatus === 'completed_late') becameCompleted = true;
  } else if (done > 0 && task.status === 'not_started') {
    newStatus = 'in_progress';
  } else if (done === 0 && task.status === 'in_progress') {
    newStatus = 'not_started';
  }

  if (newStatus === task.status) return task;

  const updateData = { status: newStatus };
  if (becameCompleted) updateData.completedAt = new Date();
  await task.update(updateData);

  // Notify supervisor + super admins on completion driven by sub-tasks
  if (becameCompleted) {
    const fresh = await Task.findByPk(task.id, {
      include: [{ association: 'assignee', attributes: ['id', 'firstName', 'lastName', 'supervisorId'] }],
    });
    const late = newStatus === 'completed_late';
    const title = late ? 'Task Completed Late' : 'Task Completed';
    const severity = late ? 'warning' : 'success';
    const message = fresh?.assignee
      ? `${fresh.assignee.firstName} ${fresh.assignee.lastName} completed${late ? ' (late)' : ''}: "${fresh.title}".`
      : `Task completed${late ? ' (late)' : ''}: "${fresh?.title || task.title}".`;

    if (fresh?.assignee?.supervisorId) {
      await Notification.create({
        userId: fresh.assignee.supervisorId,
        title, message, type: 'task_completed', severity, relatedTaskId: fresh.id,
      });
    }

    await notifySuperAdmins(
      { title, message, type: 'task_completed', severity, relatedTaskId: fresh?.id || task.id },
      { exclude: [actingUser?.id, fresh?.assignee?.supervisorId] },
    );

    await calculatePerformance(task.assignedToId);
    logger.info(`Task "${task.title}" auto-${newStatus} via sub-tasks by ${actingUser?.email || 'system'}`);
  }

  return task;
}

/**
 * GET /api/tasks/:taskId/subtasks
 */
exports.getSubTasks = async (req, res) => {
  try {
    const result = await getTask(req.params.taskId, req.user.id, req.user.role);
    if (result.error) return res.status(result.status).json({ error: result.error });

    const subtasks = await SubTask.findAll({
      where: { taskId: req.params.taskId },
      order: [['order', 'ASC']],
    });
    res.json({ subtasks });
  } catch (error) {
    logger.error(`GetSubTasks: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * POST /api/tasks/:taskId/subtasks
 * Assignee, supervisor, or super_admin can create.
 */
exports.createSubTask = async (req, res) => {
  try {
    const result = await getTask(req.params.taskId, req.user.id, req.user.role);
    if (result.error) return res.status(result.status).json({ error: result.error });

    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });

    const count = await SubTask.count({ where: { taskId: req.params.taskId } });
    const subtask = await SubTask.create({
      title: title.trim(),
      taskId: req.params.taskId,
      order: count,
    });
    res.status(201).json({ subtask });
  } catch (error) {
    logger.error(`CreateSubTask: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * PATCH /api/tasks/:taskId/subtasks/:id
 * Staff can toggle isCompleted only. Admin/supervisor can also rename.
 * Toggling completion auto-syncs the parent task's status.
 */
exports.updateSubTask = async (req, res) => {
  try {
    const result = await getTask(req.params.taskId, req.user.id, req.user.role);
    if (result.error) return res.status(result.status).json({ error: result.error });
    const { task } = result;

    const subtask = await SubTask.findOne({
      where: { id: req.params.id, taskId: req.params.taskId },
    });
    if (!subtask) return res.status(404).json({ error: 'Sub-task not found.' });

    const { title, isCompleted } = req.body;

    if (title !== undefined && req.user.role === 'staff') {
      return res.status(403).json({ error: 'Staff cannot rename sub-tasks.' });
    }

    await subtask.update({
      title: title !== undefined ? title.trim() : subtask.title,
      isCompleted: isCompleted !== undefined ? isCompleted : subtask.isCompleted,
    });

    if (isCompleted !== undefined) {
      await syncTaskStatusFromSubTasks(task, req.user);
    }

    res.json({ subtask });
  } catch (error) {
    logger.error(`UpdateSubTask: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * DELETE /api/tasks/:taskId/subtasks/:id
 * Assignee, supervisor, or super_admin.
 */
exports.deleteSubTask = async (req, res) => {
  try {
    const result = await getTask(req.params.taskId, req.user.id, req.user.role);
    if (result.error) return res.status(result.status).json({ error: result.error });

    const subtask = await SubTask.findOne({
      where: { id: req.params.id, taskId: req.params.taskId },
    });
    if (!subtask) return res.status(404).json({ error: 'Sub-task not found.' });
    await subtask.destroy();
    res.json({ message: 'Sub-task deleted.' });
  } catch (error) {
    logger.error(`DeleteSubTask: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * PUT /api/tasks/:taskId/subtasks/reorder
 * Body: { orderedIds: string[] }
 */
exports.reorderSubTasks = async (req, res) => {
  try {
    const result = await getTask(req.params.taskId, req.user.id, req.user.role);
    if (result.error) return res.status(result.status).json({ error: result.error });

    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds must be an array.' });
    }
    await Promise.all(
      orderedIds.map((id, idx) =>
        SubTask.update({ order: idx }, { where: { id, taskId: req.params.taskId } })
      )
    );
    res.json({ message: 'Sub-tasks reordered.' });
  } catch (error) {
    logger.error(`ReorderSubTasks: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const { Task, User, Department, Notification, SubTask } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { calculatePerformance } = require('../services/performance.service');
const { notifySuperAdmins, notifyUsers } = require('../services/notification.service');
const { sendEmailForNotification } = require('../services/email.service');

/**
 * GET /api/tasks
 * List tasks. Role-based filtering:
 * - super_admin: all tasks
 * - supervisor: tasks of their team + tasks they assigned
 * - staff: only their own assigned tasks
 */
exports.getTasks = async (req, res) => {
  try {
    const { status, priority, departmentId, assignedToId } = req.query;
    const where = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (departmentId) where.departmentId = departmentId;

    // Role-based access
    if (req.user.role === 'staff') {
      where.assignedToId = req.user.id;
    } else if (req.user.role === 'supervisor') {
      // Supervisor sees their team's tasks + tasks they assigned
      const teamMembers = await User.findAll({
        where: { supervisorId: req.user.id },
        attributes: ['id'],
      });
      const teamIds = teamMembers.map(m => m.id);
      teamIds.push(req.user.id); // Include their own tasks

      where[Op.or] = [
        { assignedToId: { [Op.in]: teamIds } },
        { assignedById: req.user.id },
      ];
    }

    // Admin filter by specific assignee
    if (assignedToId && (req.user.role === 'super_admin' || req.user.role === 'admin')) {
      where.assignedToId = assignedToId;
    }

    const tasks = await Task.findAll({
      where,
      include: [
        { association: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'assigner', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'department', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ tasks });
  } catch (error) {
    logger.error(`GetTasks error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * GET /api/tasks/stats
 * Task statistics for the dashboard.
 */
exports.getTaskStats = async (req, res) => {
  try {
    let taskFilter = {};

    if (req.user.role === 'staff') {
      taskFilter.assignedToId = req.user.id;
    } else if (req.user.role === 'supervisor') {
      const teamMembers = await User.findAll({
        where: { supervisorId: req.user.id },
        attributes: ['id'],
      });
      const teamIds = teamMembers.map(m => m.id);
      teamIds.push(req.user.id);
      taskFilter.assignedToId = { [Op.in]: teamIds };
    }

    const [total, completed, inProgress, overdue, notStarted, completedLate] = await Promise.all([
      Task.count({ where: taskFilter }),
      Task.count({ where: { ...taskFilter, status: 'completed' } }),
      Task.count({ where: { ...taskFilter, status: 'in_progress' } }),
      Task.count({ where: { ...taskFilter, status: 'overdue' } }),
      Task.count({ where: { ...taskFilter, status: 'not_started' } }),
      Task.count({ where: { ...taskFilter, status: 'completed_late' } }),
    ]);

    res.json({
      stats: {
        total,
        completed,
        inProgress,
        overdue,
        notStarted,
        completedLate,
        completionRate: total > 0 ? Math.round(((completed + completedLate) / total) * 100) : 0,
      },
    });
  } catch (error) {
    logger.error(`GetTaskStats error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * GET /api/tasks/:id
 * Get a single task by ID.
 */
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        { association: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'assigner', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'department', attributes: ['id', 'name'] },
      ],
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Staff can only see their own tasks
    if (req.user.role === 'staff' && task.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'You can only view tasks assigned to you.' });
    }

    res.json({ task });
  } catch (error) {
    logger.error(`GetTaskById error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * POST /api/tasks
 * Create and assign a task. Admin or supervisor only.
 * Supervisors can only assign to their own team members.
 */
exports.createTask = async (req, res) => {
  try {
    const { title, description, priority, deadline, assignedToId, departmentId } = req.body;

    if (!title || !deadline || !assignedToId) {
      return res.status(400).json({ error: 'title, deadline, and assignedToId are required.' });
    }

    // Verify assignee exists
    const assignee = await User.findByPk(assignedToId);
    if (!assignee) {
      return res.status(400).json({ error: 'Assigned user not found.' });
    }

    // Supervisors can only assign tasks to their team members
    // Admins can assign to anyone (like super_admin)
    if (req.user.role === 'supervisor') {
      if (assignee.supervisorId !== req.user.id && assignee.id !== req.user.id) {
        return res.status(403).json({ error: 'You can only assign tasks to your own team members.' });
      }
    }

    const task = await Task.create({
      title,
      description: description || null,
      priority: priority || 'medium',
      deadline: new Date(deadline),
      assignedToId,
      assignedById: req.user.id,
      departmentId: departmentId || assignee.departmentId || null,
    });

    // Create notification for the assignee
    const severity = priority === 'high' ? 'warning' : 'info';
    const deadlineStr = new Date(deadline).toLocaleDateString();
    await Notification.create({
      userId: assignedToId,
      title: 'New Task Assigned',
      message: `You have been assigned a new task: "${title}". Deadline: ${deadlineStr}.`,
      type: 'task_assigned',
      severity,
      relatedTaskId: task.id,
    });

    // Send email notification to the assignee (fire-and-forget)
    sendEmailForNotification(assignedToId, {
      title: 'New Task Assigned',
      message: `You have been assigned a new task: "${title}". Deadline: ${deadlineStr}.`,
      type: 'task_assigned',
      severity,
      taskTitle: title,
      taskDeadline: deadlineStr,
    });

    // Fan out to super admins (exclude the actor and the assignee, who already received a direct notice)
    await notifySuperAdmins(
      {
        title: 'New Task Created',
        message: `${req.user.firstName || req.user.email} assigned "${title}" to ${assignee.firstName} ${assignee.lastName}. Deadline: ${deadlineStr}.`,
        type: 'task_assigned',
        severity,
        relatedTaskId: task.id,
      },
      { exclude: [req.user.id, assignedToId] },
    );

    const fullTask = await Task.findByPk(task.id, {
      include: [
        { association: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'assigner', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'department', attributes: ['id', 'name'] },
      ],
    });

    logger.info(`Task "${title}" created and assigned to ${assignee.email} by ${req.user.email}`);

    // Update performance for the assignee (new task assigned)
    await calculatePerformance(assignedToId);

    res.status(201).json({ message: 'Task created successfully.', task: fullTask });
  } catch (error) {
    logger.error(`CreateTask error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * PUT /api/tasks/:id
 * Update a task. Admin or supervisor only.
 * Supervisors can only edit tasks they assigned or tasks assigned to their team.
 */
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [{ association: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'supervisorId'] }],
    });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Supervisors can only edit tasks they assigned or of their team members
    if (req.user.role === 'supervisor') {
      const isMyTeam = task.assignee && task.assignee.supervisorId === req.user.id;
      const isMyTask = task.assignedById === req.user.id || task.assignedToId === req.user.id;
      if (!isMyTeam && !isMyTask) {
        return res.status(403).json({ error: 'You can only edit tasks for your team members.' });
      }
    }

    const { title, description, priority, deadline, assignedToId, departmentId, status } = req.body;
    const prevAssigneeId = task.assignedToId;

    // Determine the actual status to set
    let finalStatus = status || task.status;

    // If trying to complete an overdue task, set it to completed_late
    if (status === 'completed' && task.status === 'overdue') {
      finalStatus = 'completed_late';
    }

    // Block setting overdue tasks to in_progress
    if (status === 'in_progress' && task.status === 'overdue') {
      return res.status(400).json({ error: 'Cannot set an overdue task to in progress. You may only complete it (as late completion).' });
    }

    // Validate new assignee is in supervisor's team
    if (assignedToId && req.user.role === 'supervisor') {
      const newAssignee = await User.findByPk(assignedToId);
      if (newAssignee && newAssignee.supervisorId !== req.user.id && newAssignee.id !== req.user.id) {
        return res.status(403).json({ error: 'You can only reassign tasks to your own team members.' });
      }
    }

    await task.update({
      title: title || task.title,
      description: description !== undefined ? description : task.description,
      priority: priority || task.priority,
      deadline: deadline ? new Date(deadline) : task.deadline,
      assignedToId: assignedToId || task.assignedToId,
      departmentId: departmentId !== undefined ? departmentId : task.departmentId,
      status: finalStatus,
      completedAt: (finalStatus === 'completed' || finalStatus === 'completed_late') ? new Date() : task.completedAt,
    });

    // When the task is marked complete, auto-check all its sub-tasks
    if (finalStatus === 'completed' || finalStatus === 'completed_late') {
      await SubTask.update({ isCompleted: true }, { where: { taskId: task.id } });
    }

    // Notify supervisor + super admins on completion via PUT
    if (finalStatus === 'completed' || finalStatus === 'completed_late') {
      const lateMsg = finalStatus === 'completed_late' ? ' (late)' : '';
      const completedTitle = finalStatus === 'completed_late' ? 'Task Completed Late' : 'Task Completed';
      const completedSeverity = finalStatus === 'completed_late' ? 'warning' : 'success';
      const completedMessage = `${task.assignee.firstName} ${task.assignee.lastName} completed${lateMsg}: "${task.title}".`;

      const recipients = [];
      if (task.assignee && task.assignee.supervisorId) recipients.push(task.assignee.supervisorId);
      await notifyUsers(recipients, {
        title: completedTitle,
        message: completedMessage,
        type: 'task_completed',
        severity: completedSeverity,
        relatedTaskId: task.id,
      });

      await notifySuperAdmins(
        {
          title: completedTitle,
          message: completedMessage,
          type: 'task_completed',
          severity: completedSeverity,
          relatedTaskId: task.id,
        },
        { exclude: [req.user.id, task.assignee?.supervisorId] },
      );
    }

    // Notify new assignee if task was reassigned
    if (assignedToId && assignedToId !== prevAssigneeId) {
      const reassignDeadline = new Date(task.deadline).toLocaleDateString();
      const reassignSeverity = priority === 'high' ? 'warning' : 'info';
      await Notification.create({
        userId: assignedToId,
        title: 'Task Reassigned to You',
        message: `You have been assigned the task: "${task.title}". Deadline: ${reassignDeadline}.`,
        type: 'task_assigned',
        severity: reassignSeverity,
        relatedTaskId: task.id,
      });

      // Send email notification for reassignment (fire-and-forget)
      sendEmailForNotification(assignedToId, {
        title: 'Task Reassigned to You',
        message: `You have been assigned the task: "${task.title}". Deadline: ${reassignDeadline}.`,
        type: 'task_assigned',
        severity: reassignSeverity,
        taskTitle: task.title,
        taskDeadline: reassignDeadline,
      });

      await notifySuperAdmins(
        {
          title: 'Task Reassigned',
          message: `${req.user.firstName || req.user.email} reassigned "${task.title}" to a new user. Deadline: ${reassignDeadline}.`,
          type: 'task_assigned',
          severity: reassignSeverity,
          relatedTaskId: task.id,
        },
        { exclude: [req.user.id, assignedToId] },
      );
    }

    const fullTask = await Task.findByPk(task.id, {
      include: [
        { association: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'assigner', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'department', attributes: ['id', 'name'] },
      ],
    });

    logger.info(`Task "${task.title}" updated by ${req.user.email}`);

    // Recalculate if status changed or assignee changed
    if (finalStatus === 'completed' || finalStatus === 'completed_late' || assignedToId) {
      await calculatePerformance(task.assignedToId);
      if (assignedToId && assignedToId !== prevAssigneeId && prevAssigneeId) {
        await calculatePerformance(prevAssigneeId);
      }
    }

    res.json({ message: 'Task updated successfully.', task: fullTask });
  } catch (error) {
    logger.error(`UpdateTask error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * PATCH /api/tasks/:id/status
 * Change task status. Staff can update status of their own tasks.
 * Overdue tasks:
 *   - Cannot be set to "in_progress" (blocked)
 *   - Completing an overdue task → "completed_late" (partial performance credit)
 */
exports.updateTaskStatus = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [{ association: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'supervisorId'] }],
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Staff can only update their own tasks
    if (req.user.role === 'staff' && task.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own tasks.' });
    }

    const { status } = req.body;
    const validStatuses = ['not_started', 'in_progress', 'completed'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Block: Cannot set an overdue task to in_progress
    if (status === 'in_progress' && task.status === 'overdue') {
      return res.status(400).json({
        error: 'Cannot set an overdue task to in progress. You may only mark it as completed (late completion).',
      });
    }

    // Determine the final status
    let finalStatus = status;
    if (status === 'completed' && task.status === 'overdue') {
      finalStatus = 'completed_late';
    }

    const updateData = { status: finalStatus };
    if (finalStatus === 'completed' || finalStatus === 'completed_late') {
      updateData.completedAt = new Date();

      // Auto-check all sub-tasks when the task is marked complete
      await SubTask.update({ isCompleted: true }, { where: { taskId: task.id } });

      // Notify supervisor + super admins of completion
      const lateMsg = finalStatus === 'completed_late' ? ' (late)' : '';
      const completedTitle = finalStatus === 'completed_late' ? 'Task Completed Late' : 'Task Completed';
      const completedSeverity = finalStatus === 'completed_late' ? 'warning' : 'success';
      const completedMessage = `${task.assignee.firstName} ${task.assignee.lastName} completed${lateMsg}: "${task.title}".`;

      if (task.assignee && task.assignee.supervisorId) {
        await Notification.create({
          userId: task.assignee.supervisorId,
          title: completedTitle,
          message: completedMessage,
          type: 'task_completed',
          severity: completedSeverity,
          relatedTaskId: task.id,
        });

        // Send email notification for task completion to supervisor (fire-and-forget)
        sendEmailForNotification(task.assignee.supervisorId, {
          title: completedTitle,
          message: completedMessage,
          type: 'task_completed',
          severity: completedSeverity,
          taskTitle: task.title,
        });
      }

      await notifySuperAdmins(
        {
          title: completedTitle,
          message: completedMessage,
          type: 'task_completed',
          severity: completedSeverity,
          relatedTaskId: task.id,
        },
        { exclude: [req.user.id, task.assignee?.supervisorId] },
      );
    }

    await task.update(updateData);

    // Recalculate the assignee's performance after any status change
    await calculatePerformance(task.assignedToId);

    const statusLabel = finalStatus === 'completed_late' ? 'completed (late)' : finalStatus;
    logger.info(`Task "${task.title}" status → ${statusLabel} by ${req.user.email}`);
    res.json({ message: `Task status updated to ${statusLabel}.`, task });
  } catch (error) {
    logger.error(`UpdateTaskStatus error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * DELETE /api/tasks/:id
 * Delete a task. Admin only.
 */
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Clean up related notifications
    await Notification.destroy({ where: { relatedTaskId: task.id } });

    const assignedToId = task.assignedToId;
    await task.destroy();

    // Recalculate performance for the assignee
    if (assignedToId) {
      await calculatePerformance(assignedToId);
    }

    logger.info(`Task "${task.title}" deleted by ${req.user.email}`);
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    logger.error(`DeleteTask error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

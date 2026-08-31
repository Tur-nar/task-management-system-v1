const cron = require('node-cron');
const { Op } = require('sequelize');
const { Task, Target, Notification, Complaint, ComplaintTarget, User } = require('../models');
const { calculatePerformance } = require('../services/performance.service');
const { notifySuperAdmins, notifyUsers, findRecentDeadlineWarning } = require('../services/notification.service');
const { sendEmailForNotification } = require('../services/email.service');
const logger = require('../utils/logger');

/**
 * Initialize all cron jobs.
 */
function initCronJobs() {
  // ──────────────────────────────────────────────
  // 1. Check for overdue tasks — every 10 minutes
  // ──────────────────────────────────────────────
  cron.schedule('*/10 * * * *', async () => {
    try {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const overdueTasks = await Task.findAll({
        where: {
          deadline: { [Op.lt]: startOfToday },
          status: { [Op.notIn]: ['completed', 'overdue', 'completed_late'] },
        },
        include: [
          { association: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email', 'supervisorId'] },
        ],
      });

      for (const task of overdueTasks) {
        // Mark task as overdue
        await task.update({ status: 'overdue' });
        const deadlineStr = new Date(task.deadline).toLocaleDateString();

        // Notify the assignee
        await Notification.create({
          userId: task.assignedToId,
          title: 'Task Overdue',
          message: `Your task "${task.title}" is now overdue. It was due on ${deadlineStr}.`,
          type: 'overdue_alert',
          severity: 'critical',
          relatedTaskId: task.id,
        });

        // Email the assignee about overdue task (fire-and-forget)
        sendEmailForNotification(task.assignedToId, {
          title: 'Task Overdue',
          message: `Your task "${task.title}" is now overdue. It was due on ${deadlineStr}.`,
          type: 'overdue_alert',
          severity: 'critical',
          taskTitle: task.title,
          taskDeadline: deadlineStr,
        });

        // Alert the supervisor
        if (task.assignee && task.assignee.supervisorId) {
          await Notification.create({
            userId: task.assignee.supervisorId,
            title: 'Team Task Overdue',
            message: `${task.assignee.firstName} ${task.assignee.lastName}'s task "${task.title}" is overdue. Deadline was ${deadlineStr}.`,
            type: 'overdue_alert',
            severity: 'critical',
            relatedTaskId: task.id,
          });

          // Email the supervisor about overdue task (fire-and-forget)
          sendEmailForNotification(task.assignee.supervisorId, {
            title: 'Team Task Overdue',
            message: `${task.assignee.firstName} ${task.assignee.lastName}'s task "${task.title}" is overdue. Deadline was ${deadlineStr}.`,
            type: 'overdue_alert',
            severity: 'critical',
            taskTitle: task.title,
            taskDeadline: deadlineStr,
          });
        }

        // Alert all super admins
        const assigneeName = task.assignee
          ? `${task.assignee.firstName} ${task.assignee.lastName}`
          : 'An assignee';
        await notifySuperAdmins(
          {
            title: 'Task Overdue',
            message: `${assigneeName}'s task "${task.title}" is overdue. Deadline was ${deadlineStr}.`,
            type: 'overdue_alert',
            severity: 'critical',
            relatedTaskId: task.id,
          },
          { exclude: [task.assignedToId, task.assignee?.supervisorId] },
        );
      }

      if (overdueTasks.length > 0) {
        logger.info(`Overdue check: ${overdueTasks.length} tasks marked as overdue.`);
      }
    } catch (error) {
      logger.error(`Overdue cron error: ${error.message}`);
    }
  });

  // ──────────────────────────────────────────────
  // 2. Deadline warning — every hour
  //    Tasks due within the next 24 hours
  // ──────────────────────────────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcomingTasks = await Task.findAll({
        where: {
          deadline: { [Op.between]: [now, in24Hours] },
          status: { [Op.notIn]: ['completed', 'overdue', 'completed_late'] },
        },
        include: [
          { association: 'assignee', attributes: ['id', 'firstName', 'lastName', 'supervisorId'] },
        ],
      });

      for (const task of upcomingTasks) {
        // Dedupe across assignee, supervisor, and super admins so none get re-pinged hourly
        const existingWarning = await findRecentDeadlineWarning(
          task,
          new Date(now.getTime() - 24 * 60 * 60 * 1000),
        );

        if (!existingWarning) {
          const hoursLeft = Math.round((new Date(task.deadline) - now) / (1000 * 60 * 60));

          // Warn the assignee
          await Notification.create({
            userId: task.assignedToId,
            title: 'Deadline Approaching',
            message: `Your task "${task.title}" is due in approximately ${hoursLeft} hour(s). Please prioritize completion.`,
            type: 'deadline_warning',
            severity: 'warning',
            relatedTaskId: task.id,
          });

          // Email the assignee about approaching deadline (fire-and-forget)
          sendEmailForNotification(task.assignedToId, {
            title: 'Deadline Approaching',
            message: `Your task "${task.title}" is due in approximately ${hoursLeft} hour(s). Please prioritize completion.`,
            type: 'deadline_warning',
            severity: 'warning',
            taskTitle: task.title,
            taskDeadline: new Date(task.deadline).toLocaleDateString(),
          });

          // Warn the supervisor
          if (task.assignee && task.assignee.supervisorId) {
            await Notification.create({
              userId: task.assignee.supervisorId,
              title: 'Team Task Deadline Approaching',
              message: `${task.assignee.firstName} ${task.assignee.lastName}'s task "${task.title}" is due in ~${hoursLeft} hour(s).`,
              type: 'deadline_warning',
              severity: 'warning',
              relatedTaskId: task.id,
            });

            // Email the supervisor about approaching deadline (fire-and-forget)
            sendEmailForNotification(task.assignee.supervisorId, {
              title: 'Team Task Deadline Approaching',
              message: `${task.assignee.firstName} ${task.assignee.lastName}'s task "${task.title}" is due in ~${hoursLeft} hour(s).`,
              type: 'deadline_warning',
              severity: 'warning',
              taskTitle: task.title,
              taskDeadline: new Date(task.deadline).toLocaleDateString(),
            });
          }

          // Warn all super admins
          const assigneeName = task.assignee
            ? `${task.assignee.firstName} ${task.assignee.lastName}`
            : 'An assignee';
          await notifySuperAdmins(
            {
              title: 'Task Deadline Approaching',
              message: `${assigneeName}'s task "${task.title}" is due in ~${hoursLeft} hour(s).`,
              type: 'deadline_warning',
              severity: 'warning',
              relatedTaskId: task.id,
            },
            { exclude: [task.assignedToId, task.assignee?.supervisorId] },
          );
        }
      }

      if (upcomingTasks.length > 0) {
        logger.info(`Deadline warning: ${upcomingTasks.length} tasks approaching deadline.`);
      }
    } catch (error) {
      logger.error(`Deadline warning cron error: ${error.message}`);
    }
  });

  // ──────────────────────────────────────────────
  // 3. Recalculate performance — daily at midnight
  // ──────────────────────────────────────────────
  cron.schedule('0 0 * * *', async () => {
    try {
      await calculatePerformance();
      logger.info('Daily performance recalculation completed.');
    } catch (error) {
      logger.error(`Performance cron error: ${error.message}`);
    }
  });

  // ──────────────────────────────────────────────
  // 4. Check for missed targets — every 10 minutes
  // ──────────────────────────────────────────────
  cron.schedule('*/10 * * * *', async () => {
    try {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const missedTargets = await Target.findAll({
        where: {
          deadline: { [Op.lt]: startOfToday },
          status: { [Op.notIn]: ['completed', 'missed'] },
        },
        include: [
          { association: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        ],
      });

      for (const target of missedTargets) {
        await target.update({ status: 'missed' });

        // Notify the assignee (if individual target)
        if (target.assignedToId) {
          await Notification.create({
            userId: target.assignedToId,
            title: 'Target Missed',
            message: `Your target "${target.title}" has been marked as missed. The deadline was ${new Date(target.deadline).toLocaleDateString()} and progress was ${target.currentValue}/${target.targetValue}.`,
            type: 'general',
            severity: 'critical',
          });
        }

        // Notify the creator
        if (target.createdById && target.createdById !== target.assignedToId) {
          await Notification.create({
            userId: target.createdById,
            title: 'Target Missed',
            message: `The target "${target.title}" has been missed. Progress was ${target.currentValue}/${target.targetValue}.`,
            type: 'general',
            severity: 'warning',
          });
        }
      }

      if (missedTargets.length > 0) {
        logger.info(`Missed targets check: ${missedTargets.length} targets marked as missed.`);
      }
    } catch (error) {
      logger.error(`Missed targets cron error: ${error.message}`);
    }
  });

  // ──────────────────────────────────────────────
  // 5. Check for overlooked complaints — every 5 minutes
  //    Marks stale complaints + notifies submitter, targets, admins
  // ──────────────────────────────────────────────
  cron.schedule('*/5 * * * *', async () => {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      // Fetch the actual complaints so we can notify properly
      const staleComplaints = await Complaint.findAll({
        where: {
          status: { [Op.in]: ['open', 'in_review'] },
          createdAt: { [Op.lt]: twoHoursAgo },
        },
        include: [
          { association: 'submitter', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { association: 'targets', attributes: ['id', 'firstName', 'lastName', 'email'], through: { attributes: [] } },
        ],
      });

      for (const complaint of staleComplaints) {
        await complaint.update({ status: 'overlooked' });

        // Notify the submitter
        await Notification.create({
          userId: complaint.userId,
          title: 'Complaint Overlooked',
          message: `Your complaint "${complaint.title}" has been automatically marked as overlooked after 2 hours without action.`,
          type: 'complaint_updated',
          severity: 'warning',
        });

        // Email the submitter
        sendEmailForNotification(complaint.userId, {
          title: 'Complaint Overlooked',
          message: `Your complaint "${complaint.title}" has been automatically marked as overlooked after 2 hours without action.`,
          type: 'complaint_updated',
          severity: 'warning',
        });

        // Notify targeted users
        const targetIds = (complaint.targets || []).map(t => t.id).filter(id => id !== complaint.userId);
        if (targetIds.length > 0) {
          await notifyUsers(targetIds, {
            title: 'Complaint Overlooked',
            message: `A complaint directed to you — "${complaint.title}" — has been marked as overlooked after 2 hours without action.`,
            type: 'complaint_updated',
            severity: 'warning',
          });
        }

        // Notify admins / super admins
        await notifySuperAdmins(
          {
            title: 'Complaint Overlooked',
            message: `The complaint "${complaint.title}" has been automatically marked as overlooked after 2 hours without action.`,
            type: 'complaint_updated',
            severity: 'warning',
          },
          { exclude: [complaint.userId, ...targetIds] },
        );
      }

      if (staleComplaints.length > 0) {
        logger.info(`Overlooked complaints check: ${staleComplaints.length} complaints marked as overlooked.`);
      }
    } catch (error) {
      logger.error(`Overlooked complaints cron error: ${error.message}`);
    }
  });

  logger.info('Cron jobs initialized: overdue check (10m), deadline warnings (1h), performance calc (daily), missed targets (10m), overlooked complaints (5m).');
}

module.exports = { initCronJobs };

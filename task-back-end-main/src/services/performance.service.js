const { Task, Performance, User } = require('../models');
const logger = require('../utils/logger');

/**
 * Calculate and update performance scores for all users (or a specific user).
 *
 * Performance Score Formula:
 *   base = 50
 *   on_time_bonus = (on_time / total_assigned) * 50       → up to +50
 *   late_penalty = (still_overdue / total_assigned) * 40   → up to -40
 *   completion_bonus = (all_completed / total_assigned) * 10 → up to +10
 *   late_completion_partial = (completed_late / total_assigned) * 10 → up to +10 (partial credit)
 *   score = clamp(0, 100, base + on_time_bonus - late_penalty + completion_bonus + late_completion_partial)
 *
 * Completed on time → full credit
 * Completed late → partial credit (counts toward completion but with reduced bonus)
 * Still overdue → penalty
 *
 * Rating scale:
 *   90+ → excellent
 *   75+ → good
 *   50+ → average
 *   <50 → needs_improvement
 */
async function calculatePerformance(userId = null) {
  try {
    const whereClause = userId ? { id: userId } : {};
    const users = await User.findAll({
      where: { ...whereClause, status: 'active' },
      attributes: ['id'],
    });

    for (const user of users) {
      const tasks = await Task.findAll({
        where: { assignedToId: user.id },
      });

      const totalAssigned = tasks.length;

      // On-time completions
      const completedOnTime = tasks.filter(t =>
        t.status === 'completed' && t.completedAt && t.deadline && new Date(t.completedAt) <= new Date(t.deadline)
      ).length;

      // Late completions (completed_late status OR completed after deadline)
      const completedLate = tasks.filter(t =>
        t.status === 'completed_late' ||
        (t.status === 'completed' && t.completedAt && t.deadline && new Date(t.completedAt) > new Date(t.deadline))
      ).length;

      // Total completed (on time + late)
      const totalCompleted = completedOnTime + completedLate;

      // Still overdue (not completed at all)
      const stillOverdue = tasks.filter(t => t.status === 'overdue').length;

      let score = 50;

      if (totalAssigned > 0) {
        const onTimeRatio = completedOnTime / totalAssigned;
        const overdueRatio = stillOverdue / totalAssigned;
        const completionRatio = totalCompleted / totalAssigned;
        const lateCompletionRatio = completedLate / totalAssigned;

        // Base 50 + on-time bonus (up to +50) - overdue penalty (up to -40)
        // + completion bonus (up to +10) + late completion partial (up to +10)
        score = 50
          + (onTimeRatio * 50)
          - (overdueRatio * 40)
          + (completionRatio * 10)
          + (lateCompletionRatio * 10);

        score = Math.max(0, Math.min(100, Math.round(score * 10) / 10));
      }

      let rating = 'average';
      if (score >= 90) rating = 'excellent';
      else if (score >= 75) rating = 'good';
      else if (score >= 50) rating = 'average';
      else rating = 'needs_improvement';

      // Upsert performance record
      const [performance, created] = await Performance.findOrCreate({
        where: { userId: user.id },
        defaults: {
          userId: user.id,
          tasksCompleted: totalCompleted,
          tasksOnTime: completedOnTime,
          tasksLate: stillOverdue,
          tasksCompletedLate: completedLate,
          totalTasksAssigned: totalAssigned,
          performanceScore: score,
          rating,
        },
      });

      if (!created) {
        await performance.update({
          tasksCompleted: totalCompleted,
          tasksOnTime: completedOnTime,
          tasksLate: stillOverdue,
          tasksCompletedLate: completedLate,
          totalTasksAssigned: totalAssigned,
          performanceScore: score,
          rating,
        });
      }
    }

    logger.info(`Performance recalculated for ${users.length} users.`);
  } catch (error) {
    logger.error(`Performance calculation error: ${error.message}`);
  }
}

module.exports = { calculatePerformance };

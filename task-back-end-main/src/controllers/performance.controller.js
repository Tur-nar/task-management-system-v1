const { Performance, User, Task, Department } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * GET /api/performance
 * Get all performance records. Admin or supervisor only.
 */
exports.getAllPerformance = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const userWhere = {};

    if (departmentId) userWhere.departmentId = departmentId;

    // Supervisors only see their team
    if (req.user.role === 'supervisor') {
      const teamMembers = await User.findAll({
        where: { supervisorId: req.user.id },
        attributes: ['id'],
      });
      const teamIds = teamMembers.map(m => m.id);
      teamIds.push(req.user.id);
      userWhere.id = { [Op.in]: teamIds };
    }

    // Clean up orphaned performance records (null userId)
    await Performance.destroy({ where: { userId: null } });

    const performances = await Performance.findAll({
      where: { userId: { [Op.ne]: null } },
      include: [{
        association: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
        where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
        required: true,
        include: [{ association: 'department', attributes: ['id', 'name'] }],
      }],
      order: [['performanceScore', 'DESC']],
    });

    res.json({ performances });
  } catch (error) {
    logger.error(`GetAllPerformance error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * GET /api/performance/me
 * Get own performance score.
 */
exports.getMyPerformance = async (req, res) => {
  try {
    let performance = await Performance.findOne({
      where: { userId: req.user.id },
    });

    if (!performance) {
      // Auto-create if missing
      performance = await Performance.create({
        userId: req.user.id,
        tasksCompleted: 0,
        tasksOnTime: 0,
        tasksLate: 0,
        totalTasksAssigned: 0,
        performanceScore: 0,
        rating: 'average',
      });
    }

    res.json({ performance });
  } catch (error) {
    logger.error(`GetMyPerformance error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * GET /api/performance/department/:id
 * Get all performance records for a department.
 */
exports.getDepartmentPerformance = async (req, res) => {
  try {
    const performances = await Performance.findAll({
      include: [{
        association: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
        where: { departmentId: req.params.id },
        include: [{ association: 'department', attributes: ['id', 'name'] }],
      }],
      order: [['performanceScore', 'DESC']],
    });

    res.json({ performances });
  } catch (error) {
    logger.error(`GetDepartmentPerformance error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * POST /api/performance/recalculate
 * Recalculate all performance scores. Admin only.
 */
exports.recalculateAll = async (req, res) => {
  try {
    const { calculatePerformance } = require('../services/performance.service');
    await calculatePerformance();
    res.json({ message: 'Performance scores recalculated for all users.' });
  } catch (error) {
    logger.error(`RecalculateAll error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

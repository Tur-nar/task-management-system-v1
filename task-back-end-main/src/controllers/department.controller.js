const { Department, User, Task } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/departments
 * List all departments with staff count and task stats.
 */
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      include: [
        { association: 'head', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'staff', attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'status'] },
        { association: 'tasks' },
      ],
      order: [['name', 'ASC']],
    });

    // Compute stats for each department
    const result = departments.map((dept) => {
      const deptData = dept.toJSON();
      const staffCount = deptData.staff ? deptData.staff.length : 0;
      const tasks = deptData.tasks || [];
      const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'completed_late').length;
      const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'completed_late').length;
      const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

      return {
        ...deptData,
        staffCount,
        activeTasks,
        completedTasks,
        totalTasks: tasks.length,
        completionRate,
      };
    });

    res.json({ departments: result });
  } catch (error) {
    logger.error(`GetDepartments error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * GET /api/departments/:id
 * Get a single department with full stats.
 */
exports.getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id, {
      include: [
        { association: 'head', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'staff', attributes: { exclude: ['password'] } },
        { association: 'tasks', include: [{ association: 'assignee', attributes: ['id', 'firstName', 'lastName'] }] },
      ],
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    res.json({ department });
  } catch (error) {
    logger.error(`GetDepartmentById error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * POST /api/departments
 * Create a new department. Admin only.
 */
exports.createDepartment = async (req, res) => {
  try {
    const { name, description, headId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Department name is required.' });
    }

    const existing = await Department.findOne({ where: { name } });
    if (existing) {
      return res.status(409).json({ error: 'A department with this name already exists.' });
    }

    if (headId) {
      const head = await User.findByPk(headId);
      if (!head) {
        return res.status(400).json({ error: 'Specified head user not found.' });
      }
    }

    const department = await Department.create({
      name,
      description: description || null,
      headId: headId || null,
    });

    logger.info(`Department created: ${name} by ${req.user.email}`);
    res.status(201).json({ message: 'Department created successfully.', department });
  } catch (error) {
    logger.error(`CreateDepartment error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * PUT /api/departments/:id
 * Update a department. Admin only.
 */
exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    const { name, description, headId } = req.body;

    if (name && name !== department.name) {
      const existing = await Department.findOne({ where: { name } });
      if (existing) {
        return res.status(409).json({ error: 'A department with this name already exists.' });
      }
    }

    await department.update({
      name: name || department.name,
      description: description !== undefined ? description : department.description,
      headId: headId !== undefined ? headId : department.headId,
    });

    logger.info(`Department updated: ${department.name} by ${req.user.email}`);
    res.json({ message: 'Department updated successfully.', department });
  } catch (error) {
    logger.error(`UpdateDepartment error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * DELETE /api/departments/:id
 * Delete a department. Admin only.
 */
exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id, {
      include: [{ association: 'staff' }],
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    if (department.staff && department.staff.length > 0) {
      return res.status(400).json({
        error: `Cannot delete department with ${department.staff.length} staff members. Reassign them first.`,
      });
    }

    await department.destroy();

    logger.info(`Department deleted: ${department.name} by ${req.user.email}`);
    res.json({ message: 'Department deleted successfully.' });
  } catch (error) {
    logger.error(`DeleteDepartment error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

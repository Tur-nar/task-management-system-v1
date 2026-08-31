const { Op } = require('sequelize');
const { Target, TargetEntry, User, Department } = require('../models');
const logger = require('../utils/logger');

/**
 * GET /api/targets
 * List targets. Role-based access.
 * - Staff see their own individual targets + team targets for their department
 * - Supervisors/admins see all (with optional filters)
 */
exports.getTargets = async (req, res) => {
  try {
    const { type, status, departmentId } = req.query;
    const where = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    // Staff can see their own individual targets AND team targets for their department
    if (req.user.role === 'staff') {
      const conditions = [{ assignedToId: req.user.id }];

      // Also include team targets for the staff member's department
      if (req.user.departmentId) {
        conditions.push({
          type: 'team',
          departmentId: req.user.departmentId,
        });
      }

      where[Op.or] = conditions;
    }

    const targets = await Target.findAll({
      where,
      include: [
        { association: 'assignee', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'creator', attributes: ['id', 'firstName', 'lastName'] },
        { association: 'department', attributes: ['id', 'name'] },
      ],
      order: [['deadline', 'ASC']],
    });

    res.json({ targets });
  } catch (error) {
    logger.error(`GetTargets error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * POST /api/targets
 * Create a target. Admin or supervisor only.
 */
exports.createTarget = async (req, res) => {
  try {
    const { title, type, description, targetValue, deadline, departmentId, assignedToId } = req.body;

    if (!title || !deadline) {
      return res.status(400).json({ error: 'title and deadline are required.' });
    }

    const target = await Target.create({
      title,
      type: type || 'individual',
      description: description || null,
      targetValue: targetValue || 100,
      currentValue: 0,
      deadline: new Date(deadline),
      departmentId: departmentId || null,
      assignedToId: assignedToId || null,
      createdById: req.user.id,
    });

    const fullTarget = await Target.findByPk(target.id, {
      include: [
        { association: 'assignee', attributes: ['id', 'firstName', 'lastName'] },
        { association: 'department', attributes: ['id', 'name'] },
      ],
    });

    logger.info(`Target "${title}" created by ${req.user.email}`);
    res.status(201).json({ message: 'Target created successfully.', target: fullTarget });
  } catch (error) {
    logger.error(`CreateTarget error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * PUT /api/targets/:id
 * Update a target. Admin or supervisor only.
 */
exports.updateTarget = async (req, res) => {
  try {
    const target = await Target.findByPk(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Target not found.' });
    }

    const { title, type, description, targetValue, status, deadline, departmentId, assignedToId } = req.body;

    await target.update({
      title: title || target.title,
      type: type || target.type,
      description: description !== undefined ? description : target.description,
      targetValue: targetValue || target.targetValue,
      status: status || target.status,
      deadline: deadline ? new Date(deadline) : target.deadline,
      departmentId: departmentId !== undefined ? departmentId : target.departmentId,
      assignedToId: assignedToId !== undefined ? assignedToId : target.assignedToId,
    });

    logger.info(`Target "${target.title}" updated by ${req.user.email}`);
    res.json({ message: 'Target updated successfully.', target });
  } catch (error) {
    logger.error(`UpdateTarget error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * PATCH /api/targets/:id/progress
 * Legacy progress update — now creates an entry internally for backward compat.
 */
exports.updateProgress = async (req, res) => {
  try {
    const target = await Target.findByPk(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Target not found.' });
    }

    const { currentValue } = req.body;
    if (currentValue === undefined) {
      return res.status(400).json({ error: 'currentValue is required.' });
    }

    // Calculate the difference and create an entry for it
    const diff = currentValue - target.currentValue;
    if (diff > 0) {
      await TargetEntry.create({
        value: diff,
        note: 'Progress update (legacy)',
        targetId: target.id,
        userId: req.user.id,
      });
    }

    const newStatus = currentValue >= target.targetValue
      ? 'completed'
      : currentValue >= target.targetValue * 0.7
        ? 'on_track'
        : 'at_risk';

    await target.update({
      currentValue,
      status: newStatus,
    });

    logger.info(`Target "${target.title}" progress updated to ${currentValue}/${target.targetValue}`);
    res.json({ message: 'Progress updated.', target });
  } catch (error) {
    logger.error(`UpdateProgress error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * GET /api/targets/:id/entries
 * Get all progress entries for a target.
 */
exports.getEntries = async (req, res) => {
  try {
    const target = await Target.findByPk(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Target not found.' });
    }

    // Access check for staff
    if (req.user.role === 'staff') {
      const isAssignee = target.assignedToId === req.user.id;
      const isDeptMember = target.type === 'team' && target.departmentId === req.user.departmentId;
      if (!isAssignee && !isDeptMember) {
        return res.status(403).json({ error: 'You do not have access to this target.' });
      }
    }

    const entries = await TargetEntry.findAll({
      where: { targetId: req.params.id },
      include: [
        { association: 'submitter', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ entries });
  } catch (error) {
    logger.error(`GetEntries error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * POST /api/targets/:id/entries
 * Add a progress entry to a target.
 * - Individual targets: assigned user, admin, or supervisor
 * - Team targets: department members, admin, or supervisor
 */
exports.addEntry = async (req, res) => {
  try {
    const target = await Target.findByPk(req.params.id, {
      include: [
        { association: 'assignee', attributes: ['id', 'firstName', 'lastName'] },
        { association: 'department', attributes: ['id', 'name'] },
      ],
    });

    if (!target) {
      return res.status(404).json({ error: 'Target not found.' });
    }

    // Access check — who can add entries
    if (req.user.role === 'staff') {
      const isAssignee = target.assignedToId === req.user.id;
      const isDeptMember = target.type === 'team' && target.departmentId === req.user.departmentId;
      if (!isAssignee && !isDeptMember) {
        return res.status(403).json({ error: 'You are not assigned to this target.' });
      }
    }

    // Prevent adding entries to completed or missed targets
    if (target.status === 'completed' || target.status === 'missed') {
      return res.status(400).json({ error: `Cannot add entries to a ${target.status} target.` });
    }

    const { value, note } = req.body;
    if (!value || value < 1) {
      return res.status(400).json({ error: 'value is required and must be at least 1.' });
    }

    const entry = await TargetEntry.create({
      value: parseInt(value, 10),
      note: note || null,
      targetId: target.id,
      userId: req.user.id,
    });

    // Recalculate currentValue from sum of all entries
    const sumResult = await TargetEntry.sum('value', { where: { targetId: target.id } });
    const newCurrentValue = sumResult || 0;

    // Auto-update status
    const newStatus = newCurrentValue >= target.targetValue
      ? 'completed'
      : newCurrentValue >= target.targetValue * 0.7
        ? 'on_track'
        : 'at_risk';

    await target.update({
      currentValue: newCurrentValue,
      status: newStatus,
    });

    // Reload entry with submitter info
    const fullEntry = await TargetEntry.findByPk(entry.id, {
      include: [
        { association: 'submitter', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    logger.info(`Entry +${value} added to target "${target.title}" by ${req.user.email} (total: ${newCurrentValue}/${target.targetValue})`);
    res.status(201).json({
      message: 'Entry added successfully.',
      entry: fullEntry,
      currentValue: newCurrentValue,
      targetValue: target.targetValue,
      status: newStatus,
    });
  } catch (error) {
    logger.error(`AddEntry error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * DELETE /api/targets/:id/entries/:entryId
 * Delete a progress entry. Admin or supervisor only.
 * Recalculates currentValue after deletion.
 */
exports.deleteEntry = async (req, res) => {
  try {
    const entry = await TargetEntry.findOne({
      where: { id: req.params.entryId, targetId: req.params.id },
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found.' });
    }

    await entry.destroy();

    // Recalculate currentValue
    const target = await Target.findByPk(req.params.id);
    const sumResult = await TargetEntry.sum('value', { where: { targetId: req.params.id } });
    const newCurrentValue = sumResult || 0;

    // Auto-update status
    const newStatus = newCurrentValue >= target.targetValue
      ? 'completed'
      : newCurrentValue >= target.targetValue * 0.7
        ? 'on_track'
        : 'at_risk';

    await target.update({
      currentValue: newCurrentValue,
      status: newStatus,
    });

    logger.info(`Entry deleted from target "${target.title}" by ${req.user.email} (total: ${newCurrentValue}/${target.targetValue})`);
    res.json({
      message: 'Entry deleted.',
      currentValue: newCurrentValue,
      status: newStatus,
    });
  } catch (error) {
    logger.error(`DeleteEntry error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

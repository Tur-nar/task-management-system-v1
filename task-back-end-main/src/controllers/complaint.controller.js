const { Complaint, ComplaintTarget, User, Notification } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { notifySuperAdmins, notifyUsers } = require('../services/notification.service');

// Shared include for eager-loading targets
const targetInclude = {
  association: 'targets',
  attributes: ['id', 'firstName', 'lastName', 'email'],
  through: { attributes: [] }, // hide join-table columns
};

/**
 * GET /api/complaints
 * List complaints. Role-based filtering:
 * - super_admin / admin: all complaints
 * - supervisor: complaints from their team + own + complaints targeting them
 * - staff: own complaints + complaints targeting them
 */
exports.getComplaints = async (req, res) => {
  try {
    const { status, category, priority } = req.query;
    const where = {};

    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    // Role-based access
    if (req.user.role === 'staff') {
      // Staff see complaints they submitted OR complaints targeting them
      const targetedIds = await ComplaintTarget.findAll({
        where: { userId: req.user.id },
        attributes: ['complaintId'],
      });
      const targetedComplaintIds = targetedIds.map(t => t.complaintId);

      where[Op.or] = [
        { userId: req.user.id },
        ...(targetedComplaintIds.length > 0 ? [{ id: { [Op.in]: targetedComplaintIds } }] : []),
      ];
    } else if (req.user.role === 'supervisor') {
      const teamMembers = await User.findAll({
        where: { supervisorId: req.user.id },
        attributes: ['id'],
      });
      const teamIds = teamMembers.map(m => m.id);
      teamIds.push(req.user.id);

      // Also include complaints targeting this supervisor
      const targetedIds = await ComplaintTarget.findAll({
        where: { userId: req.user.id },
        attributes: ['complaintId'],
      });
      const targetedComplaintIds = targetedIds.map(t => t.complaintId);

      where[Op.or] = [
        { userId: { [Op.in]: teamIds } },
        ...(targetedComplaintIds.length > 0 ? [{ id: { [Op.in]: targetedComplaintIds } }] : []),
      ];
    }

    const complaints = await Complaint.findAll({
      where,
      include: [
        { association: 'submitter', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
        { association: 'resolver', attributes: ['id', 'firstName', 'lastName', 'email'], required: false },
        targetInclude,
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ complaints });
  } catch (error) {
    logger.error(`GetComplaints error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * GET /api/complaints/:id
 * Get a single complaint by ID.
 */
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id, {
      include: [
        { association: 'submitter', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
        { association: 'resolver', attributes: ['id', 'firstName', 'lastName', 'email'], required: false },
        targetInclude,
      ],
    });

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    // Staff can view their own complaints OR complaints targeting them
    if (req.user.role === 'staff' && complaint.userId !== req.user.id) {
      const isTarget = complaint.targets?.some(t => t.id === req.user.id);
      if (!isTarget) {
        return res.status(403).json({ error: 'You can only view your own complaints or complaints directed to you.' });
      }
    }

    res.json({ complaint });
  } catch (error) {
    logger.error(`GetComplaintById error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * GET /api/complaints/stats
 * Get complaint statistics.
 */
exports.getComplaintStats = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'staff') {
      const targetedIds = await ComplaintTarget.findAll({
        where: { userId: req.user.id },
        attributes: ['complaintId'],
      });
      const targetedComplaintIds = targetedIds.map(t => t.complaintId);

      filter[Op.or] = [
        { userId: req.user.id },
        ...(targetedComplaintIds.length > 0 ? [{ id: { [Op.in]: targetedComplaintIds } }] : []),
      ];
    } else if (req.user.role === 'supervisor') {
      const teamMembers = await User.findAll({
        where: { supervisorId: req.user.id },
        attributes: ['id'],
      });
      const teamIds = teamMembers.map(m => m.id);
      teamIds.push(req.user.id);

      const targetedIds = await ComplaintTarget.findAll({
        where: { userId: req.user.id },
        attributes: ['complaintId'],
      });
      const targetedComplaintIds = targetedIds.map(t => t.complaintId);

      filter[Op.or] = [
        { userId: { [Op.in]: teamIds } },
        ...(targetedComplaintIds.length > 0 ? [{ id: { [Op.in]: targetedComplaintIds } }] : []),
      ];
    }

    const [total, open, inReview, resolved, dismissed, overlooked] = await Promise.all([
      Complaint.count({ where: filter }),
      Complaint.count({ where: { ...filter, status: 'open' } }),
      Complaint.count({ where: { ...filter, status: 'in_review' } }),
      Complaint.count({ where: { ...filter, status: 'resolved' } }),
      Complaint.count({ where: { ...filter, status: 'dismissed' } }),
      Complaint.count({ where: { ...filter, status: 'overlooked' } }),
    ]);

    res.json({
      stats: { total, open, inReview, resolved, dismissed, overlooked },
    });
  } catch (error) {
    logger.error(`GetComplaintStats error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * POST /api/complaints
 * Create a new complaint. All authenticated users can submit.
 * Accepts optional `targetUserIds` — an array of user UUIDs to direct the complaint at.
 */
exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, priority, targetUserIds } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    const complaint = await Complaint.create({
      title,
      description,
      category: category || 'complaint',
      priority: priority || 'medium',
      userId: req.user.id,
    });

    // ── Handle targeted users ──────────────────────────
    let validTargetIds = [];

    if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      // Filter out the submitter (can't target yourself)
      const candidateIds = [...new Set(targetUserIds.filter(id => id !== req.user.id))];

      if (candidateIds.length > 0) {
        // Verify all target IDs actually exist
        const existingUsers = await User.findAll({
          where: { id: { [Op.in]: candidateIds }, status: 'active' },
          attributes: ['id'],
        });
        validTargetIds = existingUsers.map(u => u.id);

        if (validTargetIds.length > 0) {
          await ComplaintTarget.bulkCreate(
            validTargetIds.map(userId => ({ complaintId: complaint.id, userId })),
          );
        }
      }
    }

    // ── Notify targeted users (in-app + email) ─────────
    if (validTargetIds.length > 0) {
      const categoryLabel = (category || 'complaint').replace('_', ' ');
      await notifyUsers(validTargetIds, {
        title: `${categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1)} Directed to You`,
        message: `${req.user.firstName} ${req.user.lastName} submitted a ${categoryLabel} directed to you: "${title}".`,
        type: 'complaint_submitted',
        severity: priority === 'high' ? 'warning' : 'info',
      });
    }

    // ── Notify super admins and admins ──────────────────
    const categoryLabel = (category || 'complaint').replace('_', ' ');
    await notifySuperAdmins(
      {
        title: `New ${categoryLabel} Submitted`,
        message: `${req.user.firstName} ${req.user.lastName} submitted a ${categoryLabel}: "${title}".`,
        type: 'complaint_submitted',
        severity: priority === 'high' ? 'warning' : 'info',
      },
      { exclude: [req.user.id, ...validTargetIds] },
    );

    const fullComplaint = await Complaint.findByPk(complaint.id, {
      include: [
        { association: 'submitter', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
        targetInclude,
      ],
    });

    logger.info(`Complaint "${title}" created by ${req.user.email}${validTargetIds.length > 0 ? ` (targeting ${validTargetIds.length} user(s))` : ''}`);
    res.status(201).json({ message: 'Complaint submitted successfully.', complaint: fullComplaint });
  } catch (error) {
    logger.error(`CreateComplaint error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * PATCH /api/complaints/:id/status
 * Update complaint status. Admin/Super Admin only.
 */
exports.updateComplaintStatus = async (req, res) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id, {
      include: [
        { association: 'submitter', attributes: ['id', 'firstName', 'lastName', 'email'] },
        targetInclude,
      ],
    });

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const { status, resolution } = req.body;
    const validStatuses = ['open', 'in_review', 'resolved', 'dismissed'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updateData = { status };

    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolvedAt = new Date();
      updateData.resolvedById = req.user.id;
      if (resolution) {
        updateData.resolution = resolution;
      }
    }

    await complaint.update(updateData);

    // Notify the submitter about the status change
    const statusLabel = status.replace('_', ' ');
    await Notification.create({
      userId: complaint.userId,
      title: `Complaint ${statusLabel}`,
      message: `Your complaint "${complaint.title}" has been ${statusLabel}${resolution ? `: ${resolution}` : ''}.`,
      type: 'complaint_updated',
      severity: status === 'resolved' ? 'success' : status === 'dismissed' ? 'info' : 'info',
    });

    // Also notify targeted users about the status change
    const targetIds = (complaint.targets || []).map(t => t.id).filter(id => id !== complaint.userId);
    if (targetIds.length > 0) {
      await notifyUsers(targetIds, {
        title: `Complaint ${statusLabel}`,
        message: `A complaint directed to you — "${complaint.title}" — has been ${statusLabel}${resolution ? `: ${resolution}` : ''}.`,
        type: 'complaint_updated',
        severity: status === 'resolved' ? 'success' : status === 'dismissed' ? 'info' : 'info',
      });
    }

    const updatedComplaint = await Complaint.findByPk(complaint.id, {
      include: [
        { association: 'submitter', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
        { association: 'resolver', attributes: ['id', 'firstName', 'lastName', 'email'], required: false },
        targetInclude,
      ],
    });

    logger.info(`Complaint "${complaint.title}" status → ${statusLabel} by ${req.user.email}`);
    res.json({ message: `Complaint ${statusLabel} successfully.`, complaint: updatedComplaint });
  } catch (error) {
    logger.error(`UpdateComplaintStatus error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * DELETE /api/complaints/:id
 * Delete a complaint. Admin/Super Admin or the original submitter.
 */
exports.deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id);

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    // Staff can only delete their own open complaints
    if (req.user.role === 'staff' || req.user.role === 'supervisor') {
      if (complaint.userId !== req.user.id) {
        return res.status(403).json({ error: 'You can only delete your own complaints.' });
      }
      if (complaint.status !== 'open') {
        return res.status(400).json({ error: 'You can only delete complaints that are still open.' });
      }
    }

    // Clean up join table entries first
    await ComplaintTarget.destroy({ where: { complaintId: complaint.id } });
    await complaint.destroy();

    logger.info(`Complaint "${complaint.title}" deleted by ${req.user.email}`);
    res.json({ message: 'Complaint deleted successfully.' });
  } catch (error) {
    logger.error(`DeleteComplaint error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

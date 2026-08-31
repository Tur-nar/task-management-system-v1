const { User, Department, Performance } = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

/**
 * GET /api/users
 * List all users. Supports filtering by role, department, status.
 */
exports.getUsers = async (req, res) => {
  try {
    const { role, departmentId, status } = req.query;
    const where = {};

    if (role) where.role = role;
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;

    // Supervisors can only see their own team + other supervisors
    if (req.user.role === "supervisor") {
      // They can see everyone, but filtered view is default
    }

    const include = [
      { association: "department", attributes: ["id", "name"] },
      {
        association: "supervisor",
        attributes: ["id", "firstName", "lastName", "email"],
      },
    ];

    // Only include performance data for non-staff users
    if (req.user.role !== "staff") {
      include.push({ association: "performance" });
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ["password"] },
      include,
      order: [["createdAt", "DESC"]],
    });

    res.json({ users });
  } catch (error) {
    logger.error(`GetUsers error: ${error.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * GET /api/users/supervisors
 * List all supervisors (for dropdowns in frontend).
 */
exports.getSupervisors = async (req, res) => {
  try {
    const supervisors = await User.findAll({
      where: { role: { [Op.in]: ["supervisor", "admin"] }, status: "active" },
      attributes: ["id", "firstName", "lastName", "email", "role"],
      include: [
        { association: "department", attributes: ["id", "name"] },
        {
          association: "teamMembers",
          attributes: ["id", "firstName", "lastName", "email", "status"],
        },
      ],
    });

    res.json({ supervisors });
  } catch (error) {
    logger.error(`GetSupervisors error: ${error.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * GET /api/users/:id
 * Get a single user by ID.
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password"] },
      include: [
        { association: "department", attributes: ["id", "name"] },
        {
          association: "supervisor",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          association: "teamMembers",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "email",
            "role",
            "status",
          ],
          required: false,
        },
        { association: "performance", required: false },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ user });
  } catch (error) {
    logger.error(`GetUserById error: ${error.message}`, { stack: error.stack });
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * POST /api/users
 * Create a new user (staff or supervisor). Admin only.
 * No public signup — all users are created by the super admin.
 */
exports.createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      departmentId,
      supervisorId,
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res
        .status(400)
        .json({
          error: "firstName, lastName, email, and password are required.",
        });
    }

    // if (!email.endsWith('@msspaceglobal.com')) {
    //   return res.status(400).json({ error: 'Email must end with @msspaceglobal.com.' });
    // }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters." });
    }

    // Determine the allowed role for the new user
    // Only super_admin can create admin users
    let userRole = "staff";
    if (role === "supervisor") userRole = "supervisor";
    if (role === "admin") {
      if (req.user.role !== "super_admin") {
        return res
          .status(403)
          .json({ error: "Only the super admin can create admin users." });
      }
      userRole = "admin";
    }

    // Check for duplicate email
    const existing = await User.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return res
        .status(409)
        .json({ error: "A user with this email already exists." });
    }

    // Validate department exists if provided
    if (departmentId) {
      const dept = await Department.findByPk(departmentId);
      if (!dept) {
        return res.status(400).json({ error: "Department not found." });
      }
    }

    // Validate supervisor exists if provided
    if (supervisorId) {
      const sup = await User.findByPk(supervisorId);
      if (!sup || !["supervisor", "admin", "super_admin"].includes(sup.role)) {
        return res
          .status(400)
          .json({
            error:
              "Invalid supervisor. The user must have a supervisor, admin, or super_admin role.",
          });
      }
    }

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      role: userRole,
      departmentId: departmentId || null,
      supervisorId: supervisorId || null,
    });

    // Create initial performance record
    await Performance.create({
      userId: user.id,
      tasksCompleted: 0,
      tasksOnTime: 0,
      tasksLate: 0,
      totalTasksAssigned: 0,
      performanceScore: 0,
      rating: "average",
    });

    logger.info(
      `User created: ${user.email} (${userRole}) by ${req.user.email}`,
    );

    // Fetch full user with associations
    const fullUser = await User.findByPk(user.id, {
      attributes: { exclude: ["password"] },
      include: [
        { association: "department" },
        {
          association: "supervisor",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    });

    res
      .status(201)
      .json({ message: "User created successfully.", user: fullUser });
  } catch (error) {
    logger.error(`CreateUser error: ${error.message}`);
    if (error.name === "SequelizeValidationError") {
      return res
        .status(400)
        .json({ error: error.errors.map((e) => e.message).join(", ") });
    }
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * PUT /api/users/:id
 * Update user details. Admin only.
 */
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Prevent editing super admin unless you ARE the super admin
    if (user.role === "super_admin" && req.user.id !== user.id) {
      return res
        .status(403)
        .json({ error: "Cannot modify the super admin account." });
    }

    // Admins cannot modify other admins or the super admin
    if (req.user.role === "admin") {
      if (user.role === "admin" && user.id !== req.user.id) {
        return res
          .status(403)
          .json({ error: "Admins cannot modify other admin accounts." });
      }
      if (user.role === "super_admin") {
        return res
          .status(403)
          .json({ error: "Admins cannot modify the super admin account." });
      }
    }

    const { firstName, lastName, email, role, departmentId, supervisorId } =
      req.body;

    if (email && !email.endsWith("@msspaceglobal.com")) {
      return res
        .status(400)
        .json({ error: "Email must end with @msspaceglobal.com." });
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({
        where: { email: email.toLowerCase() },
      });
      if (existing) {
        return res
          .status(409)
          .json({ error: "A user with this email already exists." });
      }
    }

    // Determine final role
    let finalRole = user.role;
    if (role) {
      // Only super_admin can assign or revoke the admin role
      if (role === "admin" && req.user.role !== "super_admin") {
        return res
          .status(403)
          .json({ error: "Only the super admin can assign the admin role." });
      }
      if (
        user.role === "admin" &&
        role !== "admin" &&
        req.user.role !== "super_admin"
      ) {
        return res
          .status(403)
          .json({ error: "Only the super admin can revoke admin access." });
      }
      // Never allow setting to super_admin
      if (role !== "super_admin") {
        finalRole = role;
      }
    }

    await user.update({
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      email: email ? email.toLowerCase() : user.email,
      role: finalRole,
      departmentId:
        departmentId !== undefined ? departmentId : user.departmentId,
      supervisorId:
        supervisorId !== undefined ? supervisorId : user.supervisorId,
    });

    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ["password"] },
      include: [
        { association: "department" },
        {
          association: "supervisor",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    });

    logger.info(`User updated: ${user.email} by ${req.user.email}`);
    res.json({ message: "User updated successfully.", user: updatedUser });
  } catch (error) {
    logger.error(`UpdateUser error: ${error.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * PATCH /api/users/:id/status
 * Activate or deactivate a user. Admin only.
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.role === "super_admin") {
      return res
        .status(403)
        .json({ error: "Cannot deactivate the super admin." });
    }

    // Admins cannot deactivate other admins or super_admin
    if (
      req.user.role === "admin" &&
      (user.role === "admin" || user.role === "super_admin")
    ) {
      return res
        .status(403)
        .json({
          error:
            "Admins cannot change the status of other admins or the super admin.",
        });
    }

    const newStatus = user.status === "active" ? "inactive" : "active";
    await user.update({ status: newStatus });

    logger.info(
      `User ${user.email} status changed to ${newStatus} by ${req.user.email}`,
    );
    res.json({
      message: `User ${newStatus === "active" ? "activated" : "deactivated"} successfully.`,
      status: newStatus,
    });
  } catch (error) {
    logger.error(`ToggleUserStatus error: ${error.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * GET /api/users/:id/team
 * Get a supervisor's team members.
 */
exports.getTeam = async (req, res) => {
  try {
    const members = await User.findAll({
      where: { supervisorId: req.params.id },
      attributes: { exclude: ["password"] },
      include: [
        { association: "department", attributes: ["id", "name"] },
        { association: "performance" },
      ],
    });

    res.json({ members });
  } catch (error) {
    logger.error(`GetTeam error: ${error.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * DELETE /api/users/:id
 * Delete a user. Admin only.
 * Cannot delete if user has active (non-completed) tasks.
 */
exports.deleteUser = async (req, res) => {
  try {
    const { Task, Notification, Target, Department } = require("../models");
    const { Op } = require("sequelize");
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.role === "super_admin") {
      return res
        .status(403)
        .json({ error: "Cannot delete the super admin account." });
    }

    // Admins cannot delete other admins
    if (req.user.role === "admin" && user.role === "admin") {
      return res
        .status(403)
        .json({ error: "Admins cannot delete other admin accounts." });
    }

    // Check for active tasks
    const activeTasks = await Task.count({
      where: {
        assignedToId: user.id,
        status: { [Op.notIn]: ["completed", "completed_late"] },
      },
    });

    if (activeTasks > 0) {
      return res.status(400).json({
        error: `Cannot delete user with ${activeTasks} active task(s). Complete or reassign them first.`,
      });
    }

    // Unlink team members if user is a supervisor
    await User.update(
      { supervisorId: null },
      { where: { supervisorId: user.id } },
    );

    // Remove as department head
    await Department.update({ headId: null }, { where: { headId: user.id } });

    // Delete related records
    await Notification.destroy({ where: { userId: user.id } });
    await Performance.destroy({ where: { userId: user.id } });
    await Target.destroy({ where: { assignedToId: user.id } });

    // Nullify completed task references instead of deleting tasks
    await Task.update(
      { assignedToId: null },
      { where: { assignedToId: user.id } },
    );
    await Task.update(
      { assignedById: null },
      { where: { assignedById: user.id } },
    );

    // Delete the user
    await user.destroy();

    logger.info(`User ${user.email} deleted by ${req.user.email}`);
    res.json({ message: "User deleted successfully." });
  } catch (error) {
    logger.error(`DeleteUser error: ${error.message}`, { stack: error.stack });
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * PATCH /api/users/:id/reassign-team
 * Reassign all team members of a supervisor to another supervisor. Admin only.
 */
exports.reassignTeam = async (req, res) => {
  try {
    const { newSupervisorId, memberIds } = req.body;

    if (!newSupervisorId) {
      return res.status(400).json({ error: "newSupervisorId is required." });
    }

    const oldSupervisor = await User.findByPk(req.params.id);
    if (!oldSupervisor) {
      return res.status(404).json({ error: "Supervisor not found." });
    }

    const newSupervisor = await User.findByPk(newSupervisorId);
    if (
      !newSupervisor ||
      !["supervisor", "admin", "super_admin"].includes(newSupervisor.role)
    ) {
      return res
        .status(400)
        .json({
          error:
            "New supervisor not found or does not have a supervisor-level role.",
        });
    }

    // Build where clause — selective or all
    const whereClause = { supervisorId: req.params.id };
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      whereClause.id = { [Op.in]: memberIds };
    }

    const [count] = await User.update(
      { supervisorId: newSupervisorId },
      { where: whereClause },
    );

    const label =
      Array.isArray(memberIds) && memberIds.length > 0 ? "selected" : "all";
    logger.info(
      `${count} ${label} team member(s) reassigned from ${oldSupervisor.email} to ${newSupervisor.email} by ${req.user.email}`,
    );
    res.json({
      message: `${count} team member(s) reassigned to ${newSupervisor.firstName} ${newSupervisor.lastName}.`,
      reassignedCount: count,
    });
  } catch (error) {
    logger.error(`ReassignTeam error: ${error.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
};

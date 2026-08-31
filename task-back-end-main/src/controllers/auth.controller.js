const { User } = require("../models");
const { signToken } = require("../utils/jwt");
const logger = require("../utils/logger");

/**
 * POST /api/auth/login
 * Login with email + password. Returns JWT token.
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    // Enforce @msspaceglobal.com domain
    // if (!email.endsWith('@msspaceglobal.com')) {
    //   return res.status(400).json({ error: 'Invalid email domain. Use your @msspaceglobal.com email.' });
    // }

    const user = await User.findOne({
      where: { email: email.toLowerCase() },
      include: [{ association: "department" }],
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (user.status === "inactive") {
      return res
        .status(403)
        .json({
          error:
            "Your account has been deactivated. Contact your administrator.",
        });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ hooks: false });

    const token = signToken(user);

    logger.info(`User logged in: ${user.email}`);

    res.json({
      message: "Login successful.",
      token,
      user: user.toSafeJSON(),
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * GET /api/auth/me
 * Get the currently authenticated user's profile.
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
      include: [
        { association: "department" },
        {
          association: "supervisor",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        { association: "performance" },
      ],
    });

    res.json({ user });
  } catch (error) {
    logger.error(`GetMe error: ${error.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * PUT /api/auth/change-password
 * Change own password.
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current and new passwords are required." });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "New password must be at least 8 characters." });
    }

    const user = await User.findByPk(req.user.id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for: ${user.email}`);
    res.json({ message: "Password changed successfully." });
  } catch (error) {
    logger.error(`ChangePassword error: ${error.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * PUT /api/auth/profile
 * Update own profile (firstName, lastName).
 */
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ error: "First name and last name are required." });
    }

    const user = await User.findByPk(req.user.id);
    user.firstName = firstName;
    user.lastName = lastName;
    await user.save();

    logger.info(`Profile updated for: ${user.email}`);
    res.json({
      message: "Profile updated successfully.",
      user: user.toSafeJSON(),
    });
  } catch (error) {
    logger.error(`UpdateProfile error: ${error.message}`);
    res.status(500).json({ error: "Internal server error." });
  }
};

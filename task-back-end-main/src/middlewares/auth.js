const { verifyToken } = require('../utils/jwt');
const { User } = require('../models');

/**
 * JWT authentication middleware.
 * Extracts token from Authorization header (Bearer <token>),
 * verifies it, and attaches the full user object to req.user.
 */
module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please provide a valid token.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
      include: [{ association: 'department' }],
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found. Token may be invalid.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact your administrator.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

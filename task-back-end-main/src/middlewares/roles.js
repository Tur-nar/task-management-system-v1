/**
 * Role-based access control middleware factory.
 * Usage: roles('super_admin', 'supervisor')
 *
 * Must be used AFTER auth middleware so req.user is available.
 */
function roles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
}

module.exports = roles;

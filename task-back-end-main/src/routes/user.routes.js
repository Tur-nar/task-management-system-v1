const router = require('express').Router();
const controller = require('../controllers/user.controller');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');

// GET /api/users/supervisors — Authenticated (must be before /:id)
router.get('/supervisors', auth, controller.getSupervisors);

// GET /api/users — Any authenticated user
router.get('/', auth, controller.getUsers);

// GET /api/users/:id — Authenticated
router.get('/:id', auth, controller.getUserById);

// GET /api/users/:id/team — Admin or Supervisor
router.get('/:id/team', auth, roles('super_admin', 'admin', 'supervisor'), controller.getTeam);

// POST /api/users — Admin only (create staff/supervisor)
router.post('/', auth, roles('super_admin', 'admin'), controller.createUser);

// PUT /api/users/:id — Admin only
router.put('/:id', auth, roles('super_admin', 'admin'), controller.updateUser);

// PATCH /api/users/:id/status — Admin only (activate/deactivate)
router.patch('/:id/status', auth, roles('super_admin', 'admin'), controller.toggleUserStatus);

// PATCH /api/users/:id/reassign-team — Admin only
router.patch('/:id/reassign-team', auth, roles('super_admin', 'admin'), controller.reassignTeam);

// DELETE /api/users/:id — Admin only
router.delete('/:id', auth, roles('super_admin', 'admin'), controller.deleteUser);

module.exports = router;

const router = require('express').Router();
const controller = require('../controllers/task.controller');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');

// GET /api/tasks/stats — Authenticated (must be before /:id)
router.get('/stats', auth, controller.getTaskStats);

// GET /api/tasks — Authenticated (role-filtered)
router.get('/', auth, controller.getTasks);

// GET /api/tasks/:id — Authenticated
router.get('/:id', auth, controller.getTaskById);

// POST /api/tasks — Admin or Supervisor (create & assign)
router.post('/', auth, roles('super_admin', 'admin', 'supervisor'), controller.createTask);

// PUT /api/tasks/:id — Admin or Supervisor
router.put('/:id', auth, roles('super_admin', 'admin', 'supervisor'), controller.updateTask);

// PATCH /api/tasks/:id/status — Authenticated (staff can update own)
router.patch('/:id/status', auth, controller.updateTaskStatus);

// DELETE /api/tasks/:id — Admin only
router.delete('/:id', auth, roles('super_admin', 'admin'), controller.deleteTask);

module.exports = router;

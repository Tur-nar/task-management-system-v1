const router = require('express').Router();
const controller = require('../controllers/department.controller');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');

// GET /api/departments — Authenticated
router.get('/', auth, controller.getDepartments);

// GET /api/departments/:id — Authenticated
router.get('/:id', auth, controller.getDepartmentById);

// POST /api/departments — Admin only
router.post('/', auth, roles('super_admin', 'admin'), controller.createDepartment);

// PUT /api/departments/:id — Admin only
router.put('/:id', auth, roles('super_admin', 'admin'), controller.updateDepartment);

// DELETE /api/departments/:id — Admin only
router.delete('/:id', auth, roles('super_admin', 'admin'), controller.deleteDepartment);

module.exports = router;

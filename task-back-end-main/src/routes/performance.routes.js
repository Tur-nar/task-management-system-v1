const router = require('express').Router();
const controller = require('../controllers/performance.controller');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');

// GET /api/performance/me — Authenticated (own score, must be before /)
router.get('/me', auth, controller.getMyPerformance);

// GET /api/performance — Admin or Supervisor
router.get('/', auth, roles('super_admin', 'admin', 'supervisor'), controller.getAllPerformance);

// GET /api/performance/department/:id — Admin or Supervisor
router.get('/department/:id', auth, roles('super_admin', 'admin', 'supervisor'), controller.getDepartmentPerformance);

// POST /api/performance/recalculate — Admin only
router.post('/recalculate', auth, roles('super_admin', 'admin'), controller.recalculateAll);

module.exports = router;

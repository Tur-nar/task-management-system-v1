const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const auth = require('../middlewares/auth');

// POST /api/auth/login — Public
router.post('/login', controller.login);

// GET /api/auth/me — Authenticated
router.get('/me', auth, controller.getMe);

// PUT /api/auth/change-password — Authenticated
router.put('/change-password', auth, controller.changePassword);

// PUT /api/auth/profile — Authenticated
router.put('/profile', auth, controller.updateProfile);

module.exports = router;

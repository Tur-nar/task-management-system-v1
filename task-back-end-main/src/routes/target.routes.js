const router = require('express').Router();
const controller = require('../controllers/target.controller');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');

// GET /api/targets — Authenticated (role-filtered)
router.get('/', auth, controller.getTargets);

// POST /api/targets — Admin or Supervisor
router.post('/', auth, roles('super_admin', 'admin', 'supervisor'), controller.createTarget);

// PUT /api/targets/:id — Admin or Supervisor
router.put('/:id', auth, roles('super_admin', 'admin', 'supervisor'), controller.updateTarget);

// PATCH /api/targets/:id/progress — Authenticated (legacy, creates entry internally)
router.patch('/:id/progress', auth, controller.updateProgress);

// GET /api/targets/:id/entries — Authenticated (access-checked)
router.get('/:id/entries', auth, controller.getEntries);

// POST /api/targets/:id/entries — Authenticated (access-checked in controller)
router.post('/:id/entries', auth, controller.addEntry);

// DELETE /api/targets/:id/entries/:entryId — Admin or Supervisor
router.delete('/:id/entries/:entryId', auth, roles('super_admin', 'admin', 'supervisor'), controller.deleteEntry);

module.exports = router;

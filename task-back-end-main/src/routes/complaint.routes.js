const router = require('express').Router();
const controller = require('../controllers/complaint.controller');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');

// GET /api/complaints/stats — Authenticated (must be before /:id)
router.get('/stats', auth, controller.getComplaintStats);

// GET /api/complaints — Authenticated (role-filtered)
router.get('/', auth, controller.getComplaints);

// GET /api/complaints/:id — Authenticated
router.get('/:id', auth, controller.getComplaintById);

// POST /api/complaints — Any authenticated user
router.post('/', auth, controller.createComplaint);

// PATCH /api/complaints/:id/status — Admin only (review/resolve/dismiss)
router.patch('/:id/status', auth, roles('super_admin', 'admin'), controller.updateComplaintStatus);

// DELETE /api/complaints/:id — Submitter (open only) or Admin
router.delete('/:id', auth, controller.deleteComplaint);

module.exports = router;

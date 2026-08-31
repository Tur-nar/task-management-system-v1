const router = require('express').Router({ mergeParams: true });
const controller = require('../controllers/subtask.controller');
const auth = require('../middlewares/auth');

router.use(auth);

router.get('/', controller.getSubTasks);
router.post('/', controller.createSubTask);
router.put('/reorder', controller.reorderSubTasks);
router.patch('/:id', controller.updateSubTask);
router.delete('/:id', controller.deleteSubTask);

module.exports = router;

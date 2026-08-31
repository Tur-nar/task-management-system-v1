const router = require('express').Router({ mergeParams: true });
const controller = require('../controllers/taskcomment.controller');
const auth = require('../middlewares/auth');

router.use(auth);

router.get('/', controller.getComments);
router.post('/', controller.createComment);
router.delete('/:id', controller.deleteComment);

module.exports = router;

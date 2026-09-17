const router = require('express').Router();
const auth = require('../middlewares/auth');
const { listUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');

router.get('/', auth, listUsers);
router.post('/', auth, createUser);
router.put('/:id', auth, updateUser);
router.delete('/:id', auth, deleteUser);

module.exports = router;
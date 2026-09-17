const router = require('express').Router();
const auth = require('../middlewares/auth');
const {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} = require('../controllers/userController');

router.get('/', auth, listRoles);
router.post('/', auth, createRole);
router.put('/:id', auth, updateRole);
router.delete('/:id', auth, deleteRole);

module.exports = router;
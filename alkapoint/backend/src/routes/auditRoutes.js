const router = require('express').Router();
const auth = require('../middlewares/auth');
const { list } = require('../controllers/auditController');

router.get('/', auth, list);

module.exports = router;
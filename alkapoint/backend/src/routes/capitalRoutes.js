const router = require('express').Router();
const auth = require('../middlewares/auth');
const { listCapital, createCapital } = require('../controllers/partnerController');

router.get('/', auth, listCapital);
router.post('/', auth, createCapital);

module.exports = router;
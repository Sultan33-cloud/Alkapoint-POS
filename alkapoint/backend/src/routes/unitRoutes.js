const router = require('express').Router();
const auth = require('../middlewares/auth');
const { listUnits, createUnit } = require('../controllers/productController');

router.get('/', auth, listUnits);
router.post('/', auth, createUnit);

module.exports = router;
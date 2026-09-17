const router = require('express').Router();
const auth = require('../middlewares/auth');
const { listSuppliers, createSupplier } = require('../controllers/purchaseController');

router.get('/', auth, listSuppliers);
router.post('/', auth, createSupplier);

module.exports = router;
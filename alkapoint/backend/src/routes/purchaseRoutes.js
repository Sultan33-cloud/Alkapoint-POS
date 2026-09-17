const router = require('express').Router();
const auth = require('../middlewares/auth');
const { createPurchase, listPurchases, getPurchase } = require('../controllers/purchaseController');

router.post('/', auth, createPurchase);
router.get('/', auth, listPurchases);
router.get('/:id', auth, getPurchase);

module.exports = router;
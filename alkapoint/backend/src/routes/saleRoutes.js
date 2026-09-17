const router = require('express').Router();
const auth = require('../middlewares/auth');
const { createSale, listSales, getSale, cancelSale } = require('../controllers/saleController');

router.post('/', auth, createSale);
router.get('/', auth, listSales);
router.get('/:id', auth, getSale);
router.post('/:id/cancel', auth, cancelSale);

module.exports = router;
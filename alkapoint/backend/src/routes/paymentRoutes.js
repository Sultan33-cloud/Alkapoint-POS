const router = require('express').Router();
const auth = require('../middlewares/auth');
const {
  listPayments,
  initiateMpesa,
  mpesaCallback,
  mpesaStatus,
  createStandalonePayment,
  getSupplierAging,
  getPurchasePayments,
} = require('../controllers/paymentController');

router.get('/', auth, listPayments);
router.post('/', auth, createStandalonePayment);
router.get('/supplier-aging', auth, getSupplierAging);
router.get('/purchase/:purchaseId', auth, getPurchasePayments);
router.post('/mpesa/initiate', auth, initiateMpesa);
router.post('/mpesa/callback', mpesaCallback);
router.get('/mpesa/status', auth, mpesaStatus);

module.exports = router;
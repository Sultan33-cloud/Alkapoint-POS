const router = require('express').Router();
const auth = require('../middlewares/auth');
const {
  listDebtors,
  recordPayment,
  getAgingReport,
  addManualDebt,
} = require('../controllers/debtorController');

router.get('/', auth, listDebtors);
router.post('/payment', auth, recordPayment);
router.post('/manual', auth, addManualDebt);
router.get('/aging', auth, getAgingReport);

module.exports = router;
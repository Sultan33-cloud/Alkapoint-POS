const router = require('express').Router();
const auth = require('../middlewares/auth');
const { salesReport, profitLoss, inventoryValuation, customerReport } = require('../controllers/reportController');

router.get('/sales', auth, salesReport);
router.get('/profit-loss', auth, profitLoss);
router.get('/inventory-valuation', auth, inventoryValuation);
router.get('/customers', auth, customerReport);

module.exports = router;
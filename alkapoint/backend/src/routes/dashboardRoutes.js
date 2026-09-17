const router = require('express').Router();
const auth = require('../middlewares/auth');
const { getSummary, getSalesTrend, getPaymentBreakdown, getTopProducts, getRecentActivity } = require('../controllers/dashboardController');

router.get('/summary', auth, getSummary);
router.get('/sales-trend', auth, getSalesTrend);
router.get('/payment-breakdown', auth, getPaymentBreakdown);
router.get('/top-products', auth, getTopProducts);
router.get('/recent-activity', auth, getRecentActivity);

module.exports = router;
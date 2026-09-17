const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/products', require('./productRoutes'));
router.use('/categories', require('./categoryRoutes'));
router.use('/units', require('./unitRoutes'));
router.use('/sales', require('./saleRoutes'));
router.use('/customers', require('./customerRoutes'));
router.use('/debtors', require('./debtorRoutes'));
router.use('/payments', require('./paymentRoutes'));
router.use('/inventory', require('./inventoryRoutes'));
router.use('/purchases', require('./purchaseRoutes'));
router.use('/suppliers', require('./supplierRoutes'));
router.use('/expenses', require('./expenseRoutes'));
router.use('/reports', require('./reportRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/roles', require('./roleRoutes'));
router.use('/settings', require('./settingRoutes'));
router.use('/partners', require('./partnerRoutes'));
router.use('/capital', require('./capitalRoutes'));
router.use('/audit-logs', require('./auditRoutes'));

module.exports = router;
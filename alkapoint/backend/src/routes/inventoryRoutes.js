const router = require('express').Router();
const auth = require('../middlewares/auth');
const { listBatches, stockSummary, adjust, movements } = require('../controllers/inventoryController');

router.get('/batches', auth, listBatches);
router.get('/stock', auth, stockSummary);
router.post('/adjust', auth, adjust);
router.get('/movements', auth, movements);

module.exports = router;
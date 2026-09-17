const router = require('express').Router();
const auth = require('../middlewares/auth');
const { getBusiness, updateBusiness, listBranches, createBranch } = require('../controllers/settingController');

router.get('/business', auth, getBusiness);
router.put('/business', auth, updateBusiness);
router.get('/branches', auth, listBranches);
router.post('/branches', auth, createBranch);

module.exports = router;
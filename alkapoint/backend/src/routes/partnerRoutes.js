const router = require('express').Router();
const auth = require('../middlewares/auth');
const { listPartners, createPartner, updatePartner, deletePartner } = require('../controllers/partnerController');

router.get('/', auth, listPartners);
router.post('/', auth, createPartner);
router.put('/:id', auth, updatePartner);
router.delete('/:id', auth, deletePartner);

module.exports = router;
const router = require('express').Router();
const auth = require('../middlewares/auth');
const { listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, getStatement } = require('../controllers/customerController');

router.get('/', auth, listCustomers);
router.get('/:id', auth, getCustomer);
router.post('/', auth, createCustomer);
router.put('/:id', auth, updateCustomer);
router.delete('/:id', auth, deleteCustomer);
router.get('/:id/statement', auth, getStatement);

module.exports = router;
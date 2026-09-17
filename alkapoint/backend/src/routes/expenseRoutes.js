const router = require('express').Router();
const auth = require('../middlewares/auth');
const { listExpenses, createExpense, deleteExpense, listCategories, createCategory } = require('../controllers/expenseController');

router.get('/', auth, listExpenses);
router.post('/', auth, createExpense);
router.delete('/:id', auth, deleteExpense);
router.get('/categories', auth, listCategories);
router.post('/categories', auth, createCategory);

module.exports = router;
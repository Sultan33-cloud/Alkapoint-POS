const router = require('express').Router();
const auth = require('../middlewares/auth');
const { listCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/productController');

router.get('/', auth, listCategories);
router.post('/', auth, createCategory);
router.put('/:id', auth, updateCategory);
router.delete('/:id', auth, deleteCategory);

module.exports = router;
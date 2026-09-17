const router = require('express').Router();
const auth = require('../middlewares/auth');
const { listProducts, getProduct, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');

router.get('/', auth, listProducts);
router.get('/:id', auth, getProduct);
router.post('/', auth, createProduct);
router.put('/:id', auth, updateProduct);
router.delete('/:id', auth, deleteProduct);

module.exports = router;
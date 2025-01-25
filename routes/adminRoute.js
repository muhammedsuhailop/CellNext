const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const productsController = require('../controllers/admin/productsController');
const brandController = require('../controllers/admin/brandController');
const upload = require('../helpers/multer');
const { userAuth, adminAuth } = require('../middlewares/auth')


router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/logout', adminController.logout);

router.get('/', adminAuth, adminController.loadDashboard);
//Customer Management
router.get('/users', adminAuth, customerController.customerInfo);
router.patch('/users/block-user', adminAuth, customerController.blockCustomer);
router.patch('/users/unblock-user', adminAuth, customerController.unblockCustomer);
//Category Management
router.get('/category', adminAuth, categoryController.categoryInfo);
router.post('/addCategory', adminAuth, categoryController.addCategory);
router.patch('/category/list', adminAuth, categoryController.listCategory);
router.patch('/category/unlist', adminAuth, categoryController.unlistCategory);
router.get('/editCategory', adminAuth, categoryController.getEditCategory);
router.put('/editCategory', adminAuth, categoryController.editCategory);
router.post('/addCategoryOffer', adminAuth, categoryController.addCategoryOffer);
router.post('/removeCategoryOffer', adminAuth, categoryController.removeCategoryOffer);
//Product Management
router.get('/addProduct', adminAuth, productsController.getAddProduct);
router.post('/addProduct', adminAuth, upload, productsController.addProduct);
router.put('/addProductVariant/:id', adminAuth, upload, productsController.addProductVariant);
router.get('/products', adminAuth, productsController.getAllProducts);
router.post('/addProductOffer', adminAuth, productsController.addProductOffer);
router.post('/removeProductOffer', adminAuth, productsController.removeProductOffer);
router.patch('/product/block', adminAuth, productsController.blockProduct);
router.patch('/product/unblock', adminAuth, productsController.unblockProduct);
router.get('/editProduct', adminAuth, productsController.getEditProduct);
router.post('/editProduct/:id', adminAuth, productsController.editProduct);
// router.post('/removeProductImage/:productId/:index', adminAuth, productsController.removeProductImage);
router.put('/editProductVariant/:id/variant/:variantIndex', adminAuth, upload, productsController.editVariant);
router.delete('/removeProductImage/:productId/:variantIndex/:index', adminAuth, productsController.remeoveVariantImage);
//Brand Management 
router.get('/brands', adminAuth, brandController.loadBrandPage);
router.get('/addBrand', adminAuth, brandController.loadAddBrandPage);
router.post('/addBrand', adminAuth, upload, brandController.addBrand);
router.patch('/brand/block', adminAuth, brandController.blockBrand);
router.patch('/brand/unblock', adminAuth, brandController.unblockBrand);

//Error-Page
router.get('/error-page', adminController.loadError);


module.exports = router;
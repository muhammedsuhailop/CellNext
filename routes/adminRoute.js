const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const productsController = require('../controllers/admin/productsController');
const upload = require('../middlewares/multer');  // Use proper path to your multer configuration
const { userAuth, adminAuth } = require('../middlewares/auth')


router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/logout', adminController.logout);

router.get('/', adminAuth, adminController.loadDashboard);
//Customer Management
router.get('/users', adminAuth, customerController.customerInfo);
router.get('/users/block-user', adminAuth, customerController.blockCustomer);
router.get('/users/unblock-user', adminAuth, customerController.unblockCustomer);
//Category Management
router.get('/category', adminAuth, categoryController.categoryInfo);
router.post('/addCategory', adminAuth, categoryController.addCategory);
router.get('/listCategory', adminAuth, categoryController.getListCategory);
router.get('/unlistCategory', adminAuth, categoryController.getUnlistCategory);
router.get('/editCategory', adminAuth, categoryController.getEditCategory);
router.post('/editCategory', adminAuth, categoryController.editCategory);
//Product Management
router.get('/addProduct', adminAuth, productsController.getAddProduct);
router.post('/addProduct', adminAuth, upload, productsController.addProduct);
router.get('/products', adminAuth, productsController.getAllProducts);
router.post('/addProductOffer', adminAuth, productsController.addProductOffer);
router.post('/removeProductOffer', adminAuth, productsController.removeProductOffer);
router.get('/bockProduct', adminAuth, productsController.bockProduct);
router.get('/unbockProduct', adminAuth, productsController.unbockProduct);
router.get('/editProduct', adminAuth, productsController.getEditProduct);
router.post('/editProduct/:id', adminAuth, upload, productsController.editProduct);
router.post('/removeProductImage/:productId/:index', adminAuth, productsController.removeProductImage);

//Error-Page
router.get('/error-page', adminController.loadError);


module.exports = router;
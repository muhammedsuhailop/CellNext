const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const productsController = require('../controllers/admin/productsController');
const brandController = require('../controllers/admin/brandController');
const orderController = require('../controllers/admin/orderController');
const couponController = require('../controllers/admin/couponController');
const reportControler = require('../controllers/admin/reportController');
const dashboardController = require('../controllers/admin/dashboardController');
const { setUploadType, upload } = require('../helpers/multer');
const { adminAuth } = require('../middlewares/auth')


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
router.get('/variants', adminAuth, productsController.getAllVariants);
router.patch('/updateVariant', adminAuth, productsController.updateProductVariant);
router.put('/editProductVariant/:id/variant/:variantIndex', adminAuth, upload, productsController.editVariant);
router.delete('/removeProductImage/:productId/:variantIndex/:index', adminAuth, productsController.removeVariantImage);
//Brand Management 
router.get('/brands', adminAuth, brandController.loadBrandPage);
router.get('/addBrand', adminAuth, brandController.loadAddBrandPage);
router.post('/addBrand', adminAuth, setUploadType('brand'), upload, brandController.addBrand);
router.patch('/brand/block', adminAuth, brandController.blockBrand);
router.patch('/brand/unblock', adminAuth, brandController.unblockBrand);

//Order Management
router.get('/orders', adminAuth, orderController.getOrders);
router.patch('/orders/update-status', adminAuth, orderController.updateStatus);
router.get('/orders/order-details/:orderId', adminAuth, orderController.getOrderDetails);
router.patch('/orders/:orderId/update-item-status', adminAuth, orderController.updateItemStatus);

//coupon Management
router.get('/coupons/add-coupon', adminAuth, couponController.loadAddCoupon);
router.post('/coupons/add-coupon', adminAuth, couponController.addCoupon);
router.get('/coupons/view-coupons', adminAuth, couponController.getAllCoupons);
router.delete('/coupons/delete-coupon', adminAuth, couponController.deleteCoupon);

//Sales Reports
router.get('/sales-report', adminAuth, reportControler.loadSalesReport);
router.get('/sales-report/download-pdf', adminAuth, reportControler.downloadPDF);
router.get('/sales-report/download-excel', adminAuth, reportControler.downloadExcel);
router.get('/dashboard', adminAuth, dashboardController.loadDashboard);

//Error-Page
router.get('/error-page', adminController.loadError);
router.use((req, res) => {
    adminController.loadError(req, res);
})


module.exports = router;
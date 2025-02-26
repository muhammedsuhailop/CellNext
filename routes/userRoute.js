const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const productcontroller = require('../controllers/user/productController');
const profileController = require('../controllers/user/profileController');
const cartController = require('../controllers/user/cartController');
const checkoutController = require('../controllers/user/checkoutController');
const orderController = require('../controllers/user/orderController');
const walletController = require('../controllers/user/walletController');
const wishlistController = require('../controllers/user/wishlistController');
const passport = require('passport');
const { userAuth, adminAuth, userAuthAjax } = require('../middlewares/auth')


router.get('/pageNotFound', userController.pageNotFound);

//signup
router.get('/signup', userController.loadSignupPage);
router.post('/signup', userController.signup);
router.post('/verify-otp', userController.verifyOtp);
router.get('/verify-otp', userController.loadVerifOtpPage);
router.post('/resend-otp', userController.resendOtp);
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), userController.googleLogin);

//login
router.get('/login', userController.loadLoginPage);
router.post('/login', userController.login);

router.get('/logout', userController.logout);

//Home & Shop
// router.get('/', userAuth, userController.loadHomePage);
// router.get('/shop', userAuth, userController.loadShopePage);
// router.get('/filter', userAuth, userController.filterProduct);
// router.get('/filterPrice', userAuth, userController.filterByPrice);
// router.post('/search', userAuth, userController.searchProduts);
router.get('/', userController.loadHomePage);
router.get('/shop', userController.loadShopePage);
router.get('/filter', userController.filterProduct);
router.get('/filterPrice', userController.filterByPrice);
router.post('/search', userController.processSearch);
router.get('/search', userController.searchProducts);
router.get('/sort', userController.sortShopProducts);

//Product Management
router.get('/productDetails', productcontroller.productDetails);

//Profile Management
router.get('/forgot-password', profileController.getForgotPassword);
router.post('/forgot-email-valid', profileController.forgotEmailValid);
router.post('/verify-forgot-password-otp', profileController.verifyForgetPassOtp);
router.post('/forgot-password-resend-otp', profileController.resendOtp);
router.get('/reset-password', profileController.getResetPassword);
router.patch('/reset-password', profileController.resetPassword);
router.get('/my-account', userAuth, profileController.loadMyAccounts);
router.get('/edit-profile', userAuth, profileController.loadeditProfile);
router.put('/update-profile', userAuth, profileController.editProfile);
router.get('/generate-refferal-code', userAuthAjax, profileController.generateReferralCode);

//Address Management
router.get('/add-address', userAuth, profileController.loadAddAddress);
router.post('/add-address', userAuth, profileController.addAddress);
router.put('/update-address', userAuth, profileController.editAddress);
router.delete('/delete-address', userAuth, profileController.deleteAddress);

//CartManagement
router.post('/cart/add', userAuthAjax, cartController.addToCart);
router.get('/cart', userAuth, cartController.loadCartPage);
router.delete('/cart/remove/:productId', userAuthAjax, cartController.removeProductFromCart);
router.post('/cart/apply-coupon', userAuthAjax, cartController.applyCoupon);
router.delete('/cart/remove-coupon', userAuthAjax, cartController.removeCoupon);
router.get('/cart/available-coupons', userAuthAjax, cartController.getCoupons);

//Checkout Management 
router.get('/checkout', userAuth, checkoutController.getCheckout);
router.post('/place-order', userAuth, orderController.placeOrder);

//Order Management
router.get('/my-orders', userAuth, orderController.loadOrderPage);
router.patch('/orders/:orderId/cancel', userAuthAjax, orderController.cancelOrder);
router.patch('/orders/:orderId/cancel-item', userAuthAjax, orderController.cancelItemOrder);
router.patch('/orders/request-return', userAuthAjax, orderController.returnRequest);
router.post('/orders/verify-razorpay-payment', userAuthAjax, orderController.verifyRazorpayPayment);
router.post('/orders/mark-payment-failed', userAuthAjax, orderController.markPaymentFailed);
router.put('/orders/retry-payment', userAuthAjax, orderController.retryPayment);
router.get('/order/invoice/:id', userAuth, orderController.generateInvoicePDF);

//Wallet
router.get('/wallet', userAuth, walletController.loadWalletPage);

//Wishlist
router.get('/wishlist', userAuth, wishlistController.loadWishlist);
router.post('/wishlist/add', userAuthAjax, wishlistController.addToWishlist);
router.delete('/wishlist/remove/:productId', userAuthAjax, wishlistController.removeProductFromWishlist);

module.exports = router
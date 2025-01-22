const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const productcontroller = require('../controllers/user/productController');
const passport = require('passport');
const { userAuth, adminAuth } = require('../middlewares/auth')


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
router.get('/',  userController.loadHomePage);
router.get('/shop',userController.loadShopePage);
router.get('/filter', userController.filterProduct);
router.get('/filterPrice',  userController.filterByPrice);
router.post('/search', userController.searchProduts);

//Product Management
router.get('/productDetails', productcontroller.productDetails);

module.exports = router
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
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
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
    res.redirect('/')
});

//login
router.get('/login', userController.loadLoginPage);
router.post('/login', userController.login);

router.get('/logout', userController.logout);

//Home & Shop
router.get('/', userAuth, userController.loadHomePage);
router.get('/shop', userAuth, userController.loadShopePage);
router.get('/filter', userAuth, userController.filterProduct)



module.exports = router
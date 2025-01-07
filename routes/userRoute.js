const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');

router.get('/pageNotFound', userController.pageNotFound);
router.get('/', userController.loadHomePage);
router.get('/login', userController.loadLoginPage);

router.get('/signup', userController.loadSignupPage);
router.post('/signup',userController.signup);
router.post('/verify-otp',userController.verifyOtp);
router.get('/verify-otp',userController.loadVerifOtpPage);
router.post('/resend-otp',userController.resendOtp);





module.exports = router
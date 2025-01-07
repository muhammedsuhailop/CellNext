const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('passport');

router.get('/pageNotFound', userController.pageNotFound);
router.get('/', userController.loadHomePage);
router.get('/login', userController.loadLoginPage);

router.get('/signup', userController.loadSignupPage);
router.post('/signup',userController.signup);
router.post('/verify-otp',userController.verifyOtp);
router.get('/verify-otp',userController.loadVerifOtpPage);
router.post('/resend-otp',userController.resendOtp);

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
})





module.exports = router
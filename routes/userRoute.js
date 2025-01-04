const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');

router.get('/pageNotFound', userController.pageNotFound);
router.get('/', userController.loadHomePage);
router.get('/login', userController.loadLoginPage);
router.get('/signup', userController.loadSignupPage);
router.get('/signup-otp', userController.loadSignupOtpPage)



module.exports = router
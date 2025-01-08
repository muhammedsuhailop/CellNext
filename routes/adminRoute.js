const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const { userAuth, adminAuth } = require('../middlewares/auth')


router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/logout', adminController.logout);

router.get('/', adminAuth, adminController.loadDashboard);

router.get('/users', customerController.customerInfo);

router.get('/error-page', adminController.loadError);


module.exports = router;
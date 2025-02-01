const { session } = require('passport');
const User = require('../models/userSchema');

const userAuth = (req, res, next) => {
    if (req.session.user) {
        User.findById(req.session.user)
            .then(user => {
                if (user && !user.isBlocked) {
                    next();
                } else {
                    console.log('User is blocked or does not exist.');
                    req.session.user = null;
                    req.flash('message', 'Your account may be temporarily or permanently disabled.');
                    res.redirect('/login');
                }
            })
            .catch(error => {
                console.error('Error in userAuth middleware:', error);
                res.status(500).send('Internal Server Error');
            });
    } else {
        console.log('User session not found.');
        req.flash('message', 'Please login or signup');
        res.redirect('/login');
    }
};


const adminAuth = (req, res, next) => {
    if (req.session.admin) {
        User.findOne({ isAdmin: true })
            .then(data => {
                if (data) {
                    next();
                } else {
                    res.redirect('/admin/login')
                }
            })
            .catch(error => {
                console.log('Error in adminauth middlware', error);
                res.status(500).send('Internal server error');
            })
    } else {
        res.redirect('/admin/login');
    }
}

module.exports = {
    userAuth,
    adminAuth
}
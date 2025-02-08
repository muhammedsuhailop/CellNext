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

const userAuthAjax = (req, res, next) => {
    if (req.session.user) {
        User.findById(req.session.user)
            .then(user => {
                if (user && !user.isBlocked) {
                    next();
                } else {
                    return res.status(401).json({ message: 'Your account may be temporarily or permanently disabled.' });
                }
            })
            .catch(error => {
                console.error('Error in userAuthAjax middleware:', error);
                return res.status(500).json({ message: 'Internal Server Error' });
            });
    } else {
        console.log('User session not found.');
        return res.status(401).json({ message: 'Please login or signup' });
    }
};

module.exports = userAuthAjax;


module.exports = {
    userAuth,
    adminAuth,
    userAuthAjax
}
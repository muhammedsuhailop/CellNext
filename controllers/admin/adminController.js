const User = require('../../models/userSchema');
const env = require('dotenv').config();
const bcrypt = require('bcrypt');


const loadLogin = async (req, res) => {
    try {
        const message = req.flash('message')[0];
        if (req.session.admin) {
            return res.redirect('/admin/');
        }
        res.render('admin-login', { message: message })
    } catch (error) {
        console.error('Admin login error', error);
        return res.redirect('/error-page')
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await User.findOne({ isAdmin: true, email: email });

        if (!admin) {
            req.flash('message', 'Admin not found');
            return res.redirect('/admin/login');
        }
        if (admin.isBlocked) {
            req.flash('message', 'Admin is blocked');
            return res.redirect('/admin/login');
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);

        if (!passwordMatch) {
            req.flash('message', 'Incorrect Password');
            return res.redirect('/admin/login');
        }

        req.session.admin = true
        req.session._id = admin._id;
        res.redirect('/admin/');
    } catch (error) {
        console.error('Admin login error', error);
        return res.redirect('/error-page')
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log('Error destroying admin session', err);
                return res.redirect('/error-page');
            }
            res.redirect('/admin/login');
        })
    } catch (error) {
        console.log('Unexpected error in logout');
        res.redirect('error-page');
    }
}

const loadError = async (req, res) => {
    res.render('error-page');
}

const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        console.log(req.session.admin)
        try {
            res.redirect('/admin/dashboard');
        } catch (error) {
            res.redirect('/error-page')
        }
    } else {
        return res.redirect('/admin/login');
    }
}


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    loadError,
    logout,
}
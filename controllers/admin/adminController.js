const User = require('../../models/userSchema');
const env = require('dotenv').config();
const bcrypt = require('bcrypt');


const loadLogin = async (req, res) => {

    if (req.session.admin) {
        return res.redirect('/admin/');
    }
    res.render('admin-login', { message: null })
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await User.findOne({ isAdmin: true, email: email });

        if (!admin) {
            return res.render('admin-login', { message: 'Admin not found' });
        }
        if (admin.isBlocked) {
            return res.render('admin-login', { message: 'Admin is blocked' });
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);

        if (!passwordMatch) {
            return res.render('admin-login', { message: 'Incorrect Password' });
        }

        req.session.admin = true
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
            res.render('dashboard');
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
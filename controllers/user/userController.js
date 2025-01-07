const User = require('../../models/userSchema');
const nodemailer = require('nodemailer');
const env = require('dotenv').config();
const bcrypt = require('bcrypt');

const loadHomePage = async (req, res) => {
    try {
        const user = req.session.user;
        if (user) {
            const userData = await User.findOne({ _id: user });
            console.log('User data', userData.name)
            res.render('home', { user: userData })
        } else {
            console.log('No loggedin user');
            return res.render('home');
        }

    } catch (error) {
        console.log('Error loading Home page');
        res.status(500).send('Server Error');
    }
}

const pageNotFound = async (req, res) => {
    try {
        res.render('page-404');
    } catch (error) {
        res.redirect('./pageNotFound');
    }
}

const loadSignupPage = async (req, res) => {
    try {
        res.render('signup', { message: '' });
    } catch (error) {
        console.log('Error loading Signup page');
        res.status(500).send('Server Error');
    }
}

const loadVerifOtpPage = async (req, res) => {
    try {
        res.render('verify-otp', { message: '' });
    } catch (error) {
        console.log('Error loading Signup page');
        res.status(500).send('Server Error');
    }
}


function generateOtp() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Verify your account',
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}`
        })

        return info.accepted.length > 0
    } catch (error) {
        console.error('Error sending email', error);
        return false;
    }
};

const signup = async (req, res) => {
    const { name, email, phone, password, confirmPassword } = req.body;
    console.log({ name, email, phone, password, confirmPassword });

    try {
        if (password !== confirmPassword) {
            console.log('Passwords do not match');
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        const existingUser = await User.findOne({ email });
        console.log('Existing User:', existingUser);

        if (existingUser) {
            console.log('Rendering signup with error code E110');
            return res.status(400).json({ errorCode: 'E110', message: 'Email is already registered' });
        }

        const genOtp = generateOtp();
        const emailSent = await sendVerificationEmail(email, genOtp);
        if (!emailSent) {
            console.log('Email error while sending OTP');
            return res.status(500).json({ message: 'Email-error' });
        }

        req.session.userOtp = genOtp;
        req.session.userData = { name, email, phone, password };
        console.log('Generated OTP:', req.session.userOtp);

        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error during user signup', error.message); // Log error message
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email not found' });
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log('Resend OTP:', otp);
            return res.status(200).json({ success: true, message: 'OTP Resent successfully' });
        } else {
            return res.status(400).json({ success: false, message: 'Failed to resend OTP. Please try again.' });
        }
    } catch (error) {
        console.error('Error during resend OTP', error.message); // Log error message
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};


const securePassword = async (password) => {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        return hashedPassword;
    } catch (error) {
        console.log('Error password hashing', error);
    }
}

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log('OTP entered:', otp);

        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            const hashedPassword = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: hashedPassword,
            });

            await saveUserData.save();
            req.session.user = saveUserData._id;

            res.json({ success: true, redirectUrl: '/' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
        }
    } catch (error) {
        console.log('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'Internal server error. Please try again later.' });
    }
};

const loadLoginPage = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render('login');
        } else {
            res.redirect('/');
        }

    } catch (error) {
        console.log('Error loading Login page');
        res.redirect('/pageNotFound');
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const findUser = await User.findOne({ isAdmin: 0, email: email });

        if (!findUser) {
            return res.render('login', { message: 'User not found' });
        }
        if (findUser.isBlocked) {
            return res.render('login', { message: 'User is blocked by admin' });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            return res.render('login', { message: 'Incorrect Password' });
        }

        req.session.user = findUser._id;
        console.log('req.session.user', req.session.user)
        res.redirect('/');
    } catch (error) {
        console.error('login error', error);
        return res.render('login', { message: 'login failed. Please try again later' });
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.redirect('pageNotFound');
            }
            return res.redirect('/login');
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.redirect('pageNotFound');
    }
};



module.exports = {
    loadHomePage,
    pageNotFound,
    loadSignupPage,
    signup,
    verifyOtp,
    loadVerifOtpPage,
    resendOtp,
    loadLoginPage,
    login,
    logout,

}
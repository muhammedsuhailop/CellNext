const User = require('../../models/userSchema');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const env = require('dotenv').config();
const session = require('express-session');

function generateOtp() {
    const digits = '1234567890';
    let otp = '';
    for (let i = 0; i < 4; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
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
            subject: 'Password Rest CellNext',
            text: `Your OTP for password Reset ${otp}`,
            html: `<b>Your OTP: ${otp}`
        })

        return info.accepted.length > 0
    } catch (error) {
        console.error('Error sending email', error);
        return false;
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

const getForgotPassword = async (req, res) => {
    try {
        const errorMessage = req.flash('error');
        res.render('forgot-password', { message: errorMessage.length > 0 ? errorMessage[0] : null });
    } catch (error) {
        console.log('Error loading Forgot password page', error);
        res.redirect('/pageNotFound');
    }
}

const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await User.findOne({ email: email });
        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                res.render('forgot-password-otp');
                console.log('OTP : ', otp);
            } else {
                res.json({ success: false, message: 'Failed to send OTP. Please try later' })
            }
        } else {
            req.flash('error', 'User not found');
            return res.redirect('/forgot-password');
        }
    } catch (error) {
        console.log('Error Forgot password ', error);
        res.redirect('/pageNotFound');
    }
}

const verifyForgetPassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        if (enteredOtp === req.session.userOtp) {
            res.json({ success: true, redirectUrl: '/reset-password' });
        } else {
            res.json({ success: false, message: 'Invalid OTP' });
        }
    } catch (error) {
        res.staus(500).json({ success: false, message: 'An error occured, Try later' });
    }
}

const getResetPassword = async (req, res) => {
    try {
        res.render('reset-password');
    } catch (error) {
        console.log('Error Reset password', error);
        res.redirect('/pageNotFound');
    }
}

const resendOtp = async (req, res) => {
    try {
        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log('Resend OTP : ', otp);
            res.status(200).json({ success: true, messege: 'Resend OTP successful' });
        }
    } catch (error) {
        console.log('Error in resend OTP', error);
        res.staus(500).json({ success: false, message: 'Internal Error' })
    }
}

const resetPassword = async (req, res) => {
    try {
        const { password1, password2 } = req.body;
        const email = req.session.email;
        if (password1 === password2) {
            const passHash = await securePassword(password1);
            await User.updateOne(
                { email: email },
                { $set: { password: passHash } }
            )
            res.status(200).json({ message: 'Password updated successfully!' });
        } else {
            res.render('reset-password', { message: 'Password do not match' })
        }
    } catch (error) {
        console.log('Error Reset password', error);
        res.redirect('/pageNotFound');
    }
}

const loadMyAccounts = async (req, res) => {
    try {
        const user = req.session.user;

        const userData = await User.findById(user);
        res.render('my-account', { user: userData });

    } catch (error) {
        console.log('error'.error);
        res.redirect('/pageNotFound');
    }
}

const loadeditProfile = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findById(user);
        res.render('edit-profile', { user: userData });
    } catch (error) {
        console.log('error'.error);
        res.redirect('/pageNotFound');
    }
}

const editProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const { firstName, lastName, phone } = req.body;
        if (!firstName || !phone) {
            return res.status(400).json({ message: 'First name and phone number are required.' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { name: `${firstName} ${lastName}`, phone: phone },
            { new: true, runValidators: true }
        )
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        return res.status(200).json({ message: 'User profile updated successfully.', user });
    } catch (error) {
        console.log('error'.error);
        res.redirect('/pageNotFound');
    }
}

module.exports = {
    getForgotPassword,
    forgotEmailValid,
    verifyForgetPassOtp,
    getResetPassword,
    resendOtp,
    resetPassword,
    loadMyAccounts,
    loadeditProfile,
    editProfile
}
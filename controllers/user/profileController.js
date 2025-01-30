const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const env = require('dotenv').config();
const session = require('express-session');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

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
        console.log('On load my accounts User:', user);
        const addressData = await Address.findOne({ userId: userData._id });

        res.render('my-account', {
            user: userData,
            addressData: addressData,

        });

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

const loadAddAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        res.render('add-address', { user: userData })
    } catch (error) {
        console.log('error'.error);
        res.redirect('/pageNotFound');
    }
}
const addAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);

        const { firstName, lastName, name, city, state, houseName,
            landmark, addressType, country, pinCode, phone, alternatePhone } = req.body;

        console.log("req", req.body);

        const userAddress = await Address.findOne({ userId: userData._id });
        const normalizedAddressType = addressType.toLowerCase();

        if (userAddress) {
            const existingAddress = userAddress.address.find(
                (addr) => addr.addressType.toLowerCase() === normalizedAddressType
            );

            if (existingAddress) {
                res.json({ success: false, message: 'This address type already exists.' });
            }
        }

        let fullName = name || `${firstName} ${lastName}`;


        if (!userAddress) {
            const newAddress = new Address({
                userId: userData._id,
                address: [{ addressType, name: fullName, city, state, houseName, landmark, country, pinCode, phone, alternatePhone }]
            })
            await newAddress.save();
        } else {
            userAddress.address.push({ addressType, name: fullName, city, state, houseName, landmark, country, pinCode, phone, alternatePhone });
            await userAddress.save();
        }

        res.json({ success: true, message: 'Saved new address successfully' });

    } catch (error) {
        console.log('Error:', error);
        res.redirect('/pageNotFound');
    }
}


const editAddress = async (req, res) => {
    try {
        console.log('On update address');
        const { addressId, name, addressType, houseName, landmark, city, state, country, pinCode, phone, alternatePhone } = req.body;

        if (!addressId || !name || !addressType || !houseName || !city || !state || !country || !pinCode || !phone || !landmark) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const userAddress = await Address.findOne({ userId: req.session.user });
        const normalizedAddressType = addressType.trim().toLowerCase();

        const existingAddress = userAddress.address.find(
            (addr) => addr.addressType.toLowerCase() === normalizedAddressType && addr._id.toString() !== addressId
        );

        if (existingAddress) {
            return res.json({ success: false, message: 'An address with this type already exists' });
        }
        const updatedAddress = await Address.findOneAndUpdate(
            { userId: req.session.user, 'address._id': req.body.addressId },
            {
                $set: {
                    'address.$.name': name,
                    'address.$.addressType': addressType,
                    'address.$.houseName': houseName,
                    'address.$.city': city,
                    'address.$.state': state,
                    'address.$.country': country,
                    'address.$.pinCode': pinCode,
                    'address.$.phone': phone,
                    'address.$.landmark': landmark,
                    'address.$.alternatePhone': alternatePhone
                }
            },
            { new: true }
        );

        console.log('Updated Address:', updatedAddress);

        if (updatedAddress) {
            return res.json({ success: true, message: 'Address updated successfully', data: updatedAddress });
        } else {
            return res.status(404).json({ success: false, message: 'Address update failed' });
        }
    } catch (error) {
        console.error('Error updating address:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.body;

        const userAddress = await Address.findOne({ userId: req.session.user });

        if (!userAddress) {
            return res.status(404).json({ success: false, message: 'User address not found' });
        }

        const addressIndex = userAddress.address.findIndex(addr => addr._id.toString() === addressId);

        if (addressIndex !== -1) {
            userAddress.address.splice(addressIndex, 1);
            await userAddress.save();
            return res.json({ success: true, message: 'Address deleted successfully' });
        } else {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }
    } catch (error) {
        console.log('Error:', error);
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
    editProfile,
    loadAddAddress,
    addAddress,
    editAddress,
    deleteAddress,
}
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { sendVerificationEmail } = require("../../services/emailService");
const { HttpStatusCode } = require("../../constents/httpStatusCodes");
const { USER_MESSAGES } = require("../../constents/userMessages");

function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 4; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

function generateShortReferralCode(length = 6) {
  return uuidv4().replace(/-/g, "").substring(0, length).toUpperCase();
}

const securePassword = async (password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    return hashedPassword;
  } catch (error) {
    console.log("Error password hashing", error);
  }
};

const getForgotPassword = async (req, res) => {
  try {
    res.render("forgot-password");
  } catch (error) {
    console.log("Error loading Forgot password page", error);
    res.redirect("/pageNotFound");
  }
};

const forgotEmailValid = async (req, res) => {
  try {
    const { email } = req.body;
    const findUser = await User.findOne({ email: email });
    if (findUser) {
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(
        email,
        otp,
        "Password Reset CellNext",
        "Password Reset",
      );
      if (emailSent) {
        req.session.userOtp = otp;
        req.session.email = email;
        res.render("forgot-password-otp");
        console.log("OTP : ", otp);
      } else {
        res.json({
          success: false,
          message: USER_MESSAGES.AUTH.ERROR.EMAIL_SEND_FAILED,
        });
      }
    } else {
      console.log("User not found:", email);
      req.flash("error", USER_MESSAGES.AUTH.ERROR.USER_NOT_FOUND);
      return res.redirect("/forgot-password");
    }
  } catch (error) {
    console.log("Error Forgot password ", error);
    res.redirect("/pageNotFound");
  }
};

const verifyForgetPassOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      res.json({ success: true, redirectUrl: "/reset-password" });
    } else {
      res.json({
        success: false,
        message: USER_MESSAGES.AUTH.ERROR.INVALID_OTP,
      });
    }
  } catch (error) {
    console.error(`\n[${new Date().toISOString()}] ${__filename}`);
    console.error(`${error.name}: ${error.message}`);

    if (error.code) console.error("Code:", error.code);
    if (error.status) console.error("Status:", error.status);

    console.error(error.stack);

    res
      .staus(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: USER_MESSAGES.AUTH.ERROR.SERVER_ERROR });
  }
};

const getResetPassword = async (req, res) => {
  try {
    res.render("reset-password");
  } catch (error) {
    console.error(`\n[${new Date().toISOString()}] ${__filename}`);
    console.error(`${error.name}: ${error.message}`);

    if (error.code) console.error("Code:", error.code);
    if (error.status) console.error("Status:", error.status);

    console.error(error.stack);

    res.redirect("/pageNotFound");
  }
};

const resendOtp = async (req, res) => {
  try {
    const otp = generateOtp();
    req.session.userOtp = otp;
    const email = req.session.email;
    const emailSent = await sendVerificationEmail(
      email,
      otp,
      "Password Reset CellNext",
      "Password Reset",
    );
    if (emailSent) {
      console.log("Resend OTP : ", otp);
      res.status(HttpStatusCode.OK).json({
        success: true,
        message: USER_MESSAGES.AUTH.SUCCESS.OTP_RESENT,
      });
    }
  } catch (error) {
    console.error(`\n[${new Date().toISOString()}] ${__filename}`);
    console.error(`${error.name}: ${error.message}`);

    if (error.code) console.error("Code:", error.code);
    if (error.status) console.error("Status:", error.status);

    console.error(error.stack);

    res.staus(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: USER_MESSAGES.AUTH.ERROR.INTERNAL_SERVER_ERROR,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { password1, password2 } = req.body;
    const email = req.session.email;
    if (password1 === password2) {
      const passHash = await securePassword(password1);
      await User.updateOne({ email: email }, { $set: { password: passHash } });
      res
        .status(HttpStatusCode.OK)
        .json({ message: USER_MESSAGES.AUTH.SUCCESS.PASSWORD_UPDATED });
    } else {
      res.render("reset-password", {
        message: USER_MESSAGES.AUTH.ERROR.PASSWORD_MISMATCH,
      });
    }
  } catch (error) {
    console.error(`\n[${new Date().toISOString()}] ${__filename}`);
    console.error(`${error.name}: ${error.message}`);

    if (error.code) console.error("Code:", error.code);
    if (error.status) console.error("Status:", error.status);

    console.error(error.stack);

    res.redirect("/pageNotFound");
  }
};

const loadMyAccounts = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findById(user);
    const addressData = await Address.findOne({ userId: userData._id });
    const cartItemCount = req.session.cartItemCount || 0;

    res.render("my-account", {
      user: userData,
      addressData: addressData,
      cartItemCount,
    });
  } catch (error) {
    console.error(`\n[${new Date().toISOString()}] ${__filename}`);
    console.error(`${error.name}: ${error.message}`);

    if (error.code) console.error("Code:", error.code);
    if (error.status) console.error("Status:", error.status);

    console.error(error.stack);

    res.redirect("/pageNotFound");
  }
};

const loadeditProfile = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findById(user);
    const cartItemCount = req.session.cartItemCount || 0;
    res.render("edit-profile", { user: userData, cartItemCount });
  } catch (error) {
    console.error(`\n[${new Date().toISOString()}] ${__filename}`);
    console.error(`${error.name}: ${error.message}`);

    if (error.code) console.error("Code:", error.code);
    if (error.status) console.error("Status:", error.status);

    console.error(error.stack);

    res.redirect("/pageNotFound");
  }
};

const editProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const { firstName, lastName, phone } = req.body;
    if (!firstName || !phone) {
      return res
        .status(400)
        .json({ message: USER_MESSAGES.PROFILE.ERROR.REQUIRED_FIELDS });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { name: `${firstName} ${lastName}`, phone: phone },
      { new: true, runValidators: true },
    );
    if (!user) {
      return res
        .status(HttpStatusCode.NOT_FOUND)
        .json({ message: USER_MESSAGES.PROFILE.ERROR.USER_NOT_FOUND });
    }

    return res
      .status(HttpStatusCode.OK)
      .json({ message: USER_MESSAGES.PROFILE.SUCCESS.PROFILE_UPDATED, user });
  } catch (error) {
    console.error(`\n[${new Date().toISOString()}] ${__filename}`);
    console.error(`${error.name}: ${error.message}`);

    if (error.code) console.error("Code:", error.code);
    if (error.status) console.error("Status:", error.status);

    console.error(error.stack);

    res.redirect("/pageNotFound");
  }
};

const loadAddAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const cartItemCount = req.session.cartItemCount || 0;
    res.render("add-address", { user: userData, cartItemCount });
  } catch (error) {
    console.error(`\n[${new Date().toISOString()}] ${__filename}`);
    console.error(`${error.name}: ${error.message}`);

    if (error.code) console.error("Code:", error.code);
    if (error.status) console.error("Status:", error.status);

    console.error(error.stack);

    res.redirect("/pageNotFound");
  }
};
const addAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);

    const {
      firstName,
      lastName,
      name,
      city,
      state,
      houseName,
      landmark,
      addressType,
      country,
      pinCode,
      phone,
      alternatePhone,
    } = req.body;

    const userAddress = await Address.findOne({ userId: userData._id });
    const normalizedAddressType = addressType.toLowerCase();

    if (userAddress) {
      const existingAddress = userAddress.address.find(
        (addr) => addr.addressType.toLowerCase() === normalizedAddressType,
      );

      if (existingAddress) {
        res.json({
          success: false,
          message: USER_MESSAGES.ADDRESS.ERROR.ADDRESS_TYPE_ALREADY_EXISTS,
        });
      }
    }

    let fullName = name || `${firstName} ${lastName}`;

    if (!userAddress) {
      const newAddress = new Address({
        userId: userData._id,
        address: [
          {
            addressType,
            name: fullName,
            city,
            state,
            houseName,
            landmark,
            country,
            pinCode,
            phone,
            alternatePhone,
          },
        ],
      });
      await newAddress.save();
    } else {
      userAddress.address.push({
        addressType,
        name: fullName,
        city,
        state,
        houseName,
        landmark,
        country,
        pinCode,
        phone,
        alternatePhone,
      });
      await userAddress.save();
    }

    res.json({ success: true, message: USER_MESSAGES.ADDRESS.SUCCESS.CREATED });
  } catch (error) {
    console.error(`\n[${new Date().toISOString()}] ${__filename}`);
    console.error(`${error.name}: ${error.message}`);

    if (error.code) console.error("Code:", error.code);
    if (error.status) console.error("Status:", error.status);

    console.error(error.stack);

    res.redirect("/pageNotFound");
  }
};

const editAddress = async (req, res) => {
  try {
    const {
      addressId,
      name,
      addressType,
      houseName,
      landmark,
      city,
      state,
      country,
      pinCode,
      phone,
      alternatePhone,
    } = req.body;

    if (
      !addressId ||
      !name ||
      !addressType ||
      !houseName ||
      !city ||
      !state ||
      !country ||
      !pinCode ||
      !phone ||
      !landmark
    ) {
      return res.status(400).json({
        success: false,
        message: USER_MESSAGES.ADDRESS.ERROR.REQUIRED_FIELDS,
      });
    }

    const userAddress = await Address.findOne({ userId: req.session.user });
    const normalizedAddressType = addressType.trim().toLowerCase();

    const existingAddress = userAddress.address.find(
      (addr) =>
        addr.addressType.toLowerCase() === normalizedAddressType &&
        addr._id.toString() !== addressId,
    );

    if (existingAddress) {
      return res.json({
        success: false,
        message: USER_MESSAGES.ADDRESS.ERROR.ADDRESS_TYPE_EXISTS,
      });
    }
    const updatedAddress = await Address.findOneAndUpdate(
      { userId: req.session.user, "address._id": req.body.addressId },
      {
        $set: {
          "address.$.name": name,
          "address.$.addressType": addressType,
          "address.$.houseName": houseName,
          "address.$.city": city,
          "address.$.state": state,
          "address.$.country": country,
          "address.$.pinCode": pinCode,
          "address.$.phone": phone,
          "address.$.landmark": landmark,
          "address.$.alternatePhone": alternatePhone,
        },
      },
      { new: true },
    );

    if (updatedAddress) {
      return res.json({
        success: true,
        message: USER_MESSAGES.ADDRESS.SUCCESS.UPDATED,
        data: updatedAddress,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: USER_MESSAGES.ADDRESS.ERROR.ADDRESS_UPDATE_FAILED,
      });
    }
  } catch (error) {
    console.error(`\n[${new Date().toISOString()}] ${__filename}`);
    console.error(`${error.name}: ${error.message}`);

    if (error.code) console.error("Code:", error.code);
    if (error.status) console.error("Status:", error.status);

    console.error(error.stack);

    return res
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: USER_MESSAGES.AUTH.ERROR.SERVER_ERROR });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.body;

    const userAddress = await Address.findOne({ userId: req.session.user });

    if (!userAddress) {
      return res.status(404).json({
        success: false,
        message: USER_MESSAGES.ADDRESS.ERROR.USER_ADDRESS_NOT_FOUND,
      });
    }

    const addressIndex = userAddress.address.findIndex(
      (addr) => addr._id.toString() === addressId,
    );

    if (addressIndex !== -1) {
      userAddress.address.splice(addressIndex, 1);
      await userAddress.save();
      return res.json({
        success: true,
        message: USER_MESSAGES.ADDRESS.SUCCESS.DELETED,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: USER_MESSAGES.ADDRESS.ERROR.ADDRESS_NOT_FOUND,
      });
    }
  } catch (error) {
    console.error(`\n[${new Date().toISOString()}] ${__filename}`);
    console.error(`${error.name}: ${error.message}`);

    if (error.code) console.error("Code:", error.code);
    if (error.status) console.error("Status:", error.status);

    console.error(error.stack);

    res.redirect("/pageNotFound");
  }
};

const generateReferralCode = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(HttpStatusCode.NOT_FOUND)
        .json({ message: USER_MESSAGES.REFERRAL.ERROR.USER_NOT_FOUND });
    }

    if (user.referralCode) {
      return res.status(HttpStatusCode.OK).json({
        message: USER_MESSAGES.REFERRAL.SUCCESS.ALREADY_EXISTS,
        referralCode: user.referralCode,
      });
    }

    const newReferralCode = generateShortReferralCode();

    user.referralCode = newReferralCode;
    await user.save();

    return res.status(HttpStatusCode.OK).json({
      message: USER_MESSAGES.REFERRAL.SUCCESS.GENERATED,
      referralCode: newReferralCode,
    });
  } catch (error) {
    console.error(`\n[${new Date().toISOString()}] ${__filename}`);
    console.error(`${error.name}: ${error.message}`);

    if (error.code) console.error("Code:", error.code);
    if (error.status) console.error("Status:", error.status);

    console.error(error.stack);

    return res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
      message: USER_MESSAGES.REFERRAL.ERROR.GENERATION_FAILED,
    });
  }
};

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
  generateReferralCode,
};

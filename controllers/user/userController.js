const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Brand = require('../../models/brandSchema');
const nodemailer = require('nodemailer');
const env = require('dotenv').config();
const bcrypt = require('bcrypt');

const loadHomePage = async (req, res) => {
    try {
        const user = req.session.user;
        const categories = await Category.find({ isListed: true });
        const productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) }, quantity: { $gt: 0 }
        });

        productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const heroData = [
            {
                backgroundImage: "img/hero/oppo banner1.PNG",
                collection: "New Year Collection",
                title: "Exclusive New Year Collections ",
                description: "Crafting the future of mobile phones, where luxury meets innovation. Designed with precision and ethically produced to deliver unmatched quality, each device is a testament to excellence in craftsmanship.",
                link: "#"
            },
            {
                backgroundImage: "img/hero/banner--5.PNG",
                collection: "Summer Collection",
                title: "iPhone: Where cutting-edge technology meets timeless elegance.",
                description: "Designed to elevate your experience with unmatched performance and seamless style.",
                link: "#"
            }
        ];

        if (user) {
            const userData = await User.findOne({ _id: user });
            console.log('User data', userData.name)
            res.render('home', { user: userData, products: productData, heroData: heroData })
        } else {
            console.log('No loggedin user');
            return res.render('home', { products: productData, heroData: heroData });
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
        console.error('Error during user signup', error.message);
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
        console.error('Error during resend OTP', error.message);
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
        const message = req.flash('message')[0];
        if (!req.session.user) {
            return res.render('login', { message: message });
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
            req.flash('message', 'User not found');
            return res.redirect('/login');
        }
        if (findUser.isBlocked) {
            req.flash('message', 'This account is blocked');
            return res.redirect('/login');
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            req.flash('message', 'Incorrect Password');
            return res.redirect('/login');
        }

        req.session.user = findUser._id;
        console.log('req.session.user', req.session.user)
        res.redirect('/');
    } catch (error) {
        console.error('login error', error);
        return res.render('login', { message: 'login failed. Please try again later' });
    }
}

const googleLogin = async (req, res) => {
    if (req.user) {
        req.session.user = req.user._id;
        console.log('req.session.user', req.session.user);
    }
    res.redirect('/')
}

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.redirect('pageNotFound');
            }
            return res.redirect('/');
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.redirect('pageNotFound');
    }
};

const loadShopePage = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map((category) => category._id.toString());
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;
        const products = await Product.find({
            isBlocked: false,
            category: { $in: categoryIds }
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: { $in: categoryIds }
        });
        const totalPages = Math.ceil(totalProducts / limit);

        const brands = await Brand.find({ isBlocked: false });
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));


        res.render('shop', {
            user: userData,
            products: products,
            brand: brands,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages,
            categoriesWithIds: categoriesWithIds
        });
    } catch (error) {
        console.error('Shope page error:', error);
        res.redirect('pageNotFound');
    }
}

const filterProduct = async (req, res) => {
    try {
        const user = req.session.user;
        const category = req.query.category;
        const brand = req.query.brand;

        console.log('Query Parameters:', { category, brand });

        const findCategory = category ? await Category.findOne({ _id: category }) : null;
        const findBrand = brand ? await Brand.findOne({ _id: brand }) : null;

        console.log('Found Category:', findCategory);
        console.log('Found Brand:', findBrand);

        const brands = await Brand.find({}).lean();

        const query = { isBlocked: false };

        if (findCategory) {
            query.category = findCategory._id;
        }

        if (findBrand) {
            query.brand = findBrand.brandName;
        }

        let findProducts = await Product.find(query).lean();

        if (findProducts.length === 0) {
            console.log('No products found for the given filters.');
        }

        findProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        console.log('Sorted Products:', findProducts);

        const categories = await Category.find({ isListed: true });
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));

        let totalProducts = findProducts.length;

        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(totalProducts / itemsPerPage);
        const currentProduct = findProducts.slice(startIndex, endIndex);

        let userData = null;
        if (user) {
            userData = await User.findOne({ _id: user });
            if (userData) {
                const searchEntry = {
                    category: findCategory ? findCategory._id : null,
                    brand: findBrand ? findBrand._id : null,
                    searchedOn: new Date()
                };
                userData.searchHistory.push(searchEntry);
                await userData.save();
            }
        }

        req.session.filteredProducts = findProducts;

        res.render('shop', {
            user: userData,
            products: currentProduct,
            category: categories,
            brand: brands,
            totalPages,
            currentPage,
            selectedCategory: category,
            categoriesWithIds: categoriesWithIds,
            selectedBrand: brand || null,
            totalProducts: totalProducts
        });

    } catch (error) {
        console.error('Shop filter error:', error);
        res.redirect('pageNotFound');
    }
};

const filterByPrice = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        const brands = await Brand.find({}).lean();
        const categories = await Category.find({ isListed: true }).lean();
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));


        let findProducts = await Product.find({
            salePrice: { $gt: req.query.gt, $lt: req.query.lt },
            isBlocked: false,
        }).lean();

        findProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        let totalProducts = findProducts.length;

        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(totalProducts / itemsPerPage);
        const currentProduct = findProducts.slice(startIndex, endIndex);
        req.session.filteredProducts = findProducts;

        res.render('shop', {
            user: userData,
            products: currentProduct,
            category: categories,
            brand: brands,
            totalPages,
            currentPage,
            categoriesWithIds: categoriesWithIds,
            totalProducts: totalProducts
        });

    } catch (error) {
        console.error('Shop filter error:', error);
        res.redirect('pageNotFound');
    }
}

const searchProduts = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        let search = req.body.query;

        const brands = await Brand.find({}).lean();
        const categories = await Category.find({ isListed: true }).lean();
        const categoryIds = categories.map(category => category._id.toString());
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));

        let searchResult = [];
        if (req.session.filteredProducts && req.session.filteredProducts.length > 0) {
            searchResult = req.session.filteredProducts.filter(product =>
                product.productName.toLowerCase().includes(search.toLowerCase()));
            console.log(searchResult)
        } else {
            searchResult = await Product.find({
                productName: { $regex: ".*" + search + ".*", $options: "i" },
                isBlocked: false,
                category: { $in: categoryIds }
            });
            console.log(searchResult)
        }

        searchResult.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        console.log('After if', searchResult)

        let totalProducts = searchResult.length;

        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(totalProducts / itemsPerPage);
        const currentProduct = searchResult.slice(startIndex, endIndex);

        res.render('shop', {
            user: userData,
            products: currentProduct,
            category: categories,
            brand: brands,
            totalPages,
            currentPage,
            categoriesWithIds: categoriesWithIds,
            totalProducts: totalProducts
        });
    } catch (error) {
        console.error('search error:', error);
        res.redirect('pageNotFound');
    }
}

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
    googleLogin,
    logout,
    loadShopePage,
    filterProduct,
    filterByPrice,
    searchProduts,

}
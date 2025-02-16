const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const ProductV2 = require('../../models/productsSchemaV2');
const Brand = require('../../models/brandSchema');
const Cart = require('../../models/cartSchema');
const Wallet = require('../../models/walletSchema');
const nodemailer = require('nodemailer');
const env = require('dotenv').config();
const bcrypt = require('bcrypt');

const loadHomePage = async (req, res) => {
    try {
        const user = req.session.user;
        const categories = await Category.find({ isListed: true });
        const brands = await Brand.find({ isBlocked: false });
        const productData = await ProductV2.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            variants: {
                $elemMatch: {
                    stock: { $gt: 0 }
                }
            }
        });

        productData.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        const appleBrand = brands.find(brand => brand.brandName === 'Apple');
        const appleId = appleBrand ? appleBrand._id : null;
        const heroData = [
            {
                backgroundImage: "img/hero/oppo banner1.PNG",
                collection: "New Year Collection",
                title: "Exclusive New Year Collections ",
                description: "Crafting the future of mobile phones, where luxury meets innovation. Designed with precision and ethically produced to deliver unmatched quality, each device is a testament to excellence in craftsmanship.",
                link: "/shop"
            },
            {
                backgroundImage: "img/hero/banner--5.PNG",
                collection: "Apple Zone",
                title: "iPhone: Where cutting-edge technology meets timeless elegance.",
                description: "Designed to elevate your experience with unmatched performance and seamless style.",
                link: appleId ? `/filter?brand=${appleId}` : "#"
            }
        ];

        const cartItemCount = req.session.cartItemCount || 0;

        if (user) {
            const userData = await User.findOne({ _id: user });

            let wallet = await Wallet.findOne({ userId: userData._id });
            if (!wallet) {
                console.log("No wallet found, creating new wallet...");
                wallet = new Wallet({ userId: userData._id, transactions: [] });
                await wallet.save();
                userData.wallet = wallet._id;
                await userData.save();
                console.log("Wallet created successfully.");
            }
            console.log('User data', userData.name);
            const successMessage = req.flash('success');
            const errorMessage = req.flash('error');
            res.render('home', {
                user: userData,
                products: productData,
                categories: categories,
                heroData: heroData,
                messages: {
                    success: successMessage.length > 0 ? successMessage[0] : null,
                    error: errorMessage.length > 0 ? errorMessage[0] : null,
                },
                cartItemCount
            })
        } else {
            console.log('No loggedin user');
            const successMessage = req.flash('success');
            const errorMessage = req.flash('error');
            errorMessage.push("You're not logged in");
            return res.render('home', {
                products: productData,
                categories: categories,
                heroData: heroData,
                messages: {
                    success: successMessage.length > 0 ? successMessage[0] : null,
                    error: errorMessage.length > 0 ? errorMessage[0] : null,
                },
                cartItemCount
            });
        }

    } catch (error) {
        console.log('Error loading Home page', error);
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

            const wallet = new Wallet({ userId: saveUserData._id });
            await wallet.save();

            saveUserData.wallet = wallet._id;
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

        let cartItemCount = 0;
        if (findUser.cart && findUser.cart.length > 0) {
            const cart = await Cart.findOne({ _id: findUser.cart[0] }).lean();
            if (cart && cart.items && cart.items.length > 0) {
                cartItemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
            }
        }

        req.session.user = findUser._id;
        req.session.cartItemCount = cartItemCount;
        req.flash('success', 'You have successfully logged in!');
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

        const blockedBrandNames = await Brand.find({ isBlocked: true })
        const blockedBrandList = blockedBrandNames.map((brand) => brand.brandName);
        const products = await ProductV2.find({
            isBlocked: false,
            category: { $in: categoryIds },
            brand: { $nin: blockedBrandList }
        })
            .sort({ createdAt: -1 });

        const productVariants = products.flatMap(product =>
            product.variants.map((variant, variantIndex) => ({
                _id: product._id,
                productName: product.productName,
                description: product.description,
                brand: product.brand,
                category: product.category,
                productOffer: product.productOffer,
                variantColor: variant.color,
                variantSize: variant.size,
                variantRegularPrice: variant.regularPrice,
                variantSalePrice: variant.salePrice,
                variantStock: variant.stock,
                variantImages: variant.images,
                status: product.status,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt,
                totalVariants: product.variants.length,
                variantNumber: variantIndex++,
            }))
        );

        const paginatedVariants = productVariants.slice(skip, skip + limit);


        const totalPages = Math.ceil(productVariants.length / limit);

        const brands = await Brand.find({ isBlocked: false });
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));
        const cartItemCount = req.session.cartItemCount || 0;
        req.session.filters = {
            category: null,
            brand: null,
            price: { gt: null, lt: null },
        };
        req.session.filteredProducts = null;
        selectedFilters = req.session.filters;


        res.render('shop', {
            user: userData,
            products: paginatedVariants,
            brand: brands,
            totalProducts: productVariants.length,
            currentPage: page,
            totalPages: totalPages,
            categoriesWithIds: categoriesWithIds,
            cartItemCount,
            selectedFilters,
        });
    } catch (error) {
        console.error('Shope page error:', error);
        res.redirect('pageNotFound');
    }
}

const filterProduct = async (req, res) => {
    try {
        const user = req.session.user;

        if (!req.session.filters) {
            req.session.filters = {
                category: null,
                brand: null,
                price: { gt: null, lt: null },
            };
        }


        const categoryName = req.query.category || req.session.filters.category;
        const brandName = req.query.brand || req.session.filters.brand;
        const priceGt = req.query.gt !== undefined ? req.query.gt : req.session.filters.price.gt;
        const priceLt = req.query.lt !== undefined ? req.session.filters.price.lt : req.session.filters.price.lt;

        req.session.filters = { category: categoryName, brand: brandName, price: { gt: priceGt, lt: priceLt } };

        console.log('Applied Filters:', req.session.filters);

        const blockedBrandNames = await Brand.find({ isBlocked: true }).select('brandName');
        const blockedBrandList = blockedBrandNames.map((b) => b.brandName);

        const findCategory = categoryName ? await Category.findOne({ name: categoryName }) : null;
        const findBrand = brandName ? await Brand.findOne({ brandName }) : null;

        // console.log('Found Category:', findCategory);
        // console.log('Found Brand:', findBrand);

        const brands = await Brand.find({}).lean();

        let query = { isBlocked: false, brand: { $nin: blockedBrandList } };

        if (findCategory) query.category = findCategory._id;
        if (findBrand) query.brand = findBrand.brandName;

        const findProducts = await ProductV2.find(query).lean();

        if (findProducts.length === 0) {
            console.log('No products found for the given filters.');
        }

        let allVariants = findProducts.flatMap(product =>
            product.variants
                .filter(variant =>
                    (!priceGt || variant.salePrice > priceGt) &&
                    (!priceLt || variant.salePrice < priceLt)
                )
                .map(variant => ({
                    _id: product._id,
                    productName: product.productName,
                    description: product.description,
                    brand: product.brand,
                    category: product.category,
                    productOffer: product.productOffer,
                    variantColor: variant.color,
                    variantSize: variant.size,
                    variantStorage: variant.storage,
                    variantRegularPrice: variant.regularPrice,
                    variantSalePrice: variant.salePrice,
                    variantStock: variant.stock,
                    variantImages: variant.images,
                    createdAt: product.createdAt,
                    updatedAt: product.updatedAt,
                }))
        );

        allVariants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        req.session.filteredProducts = allVariants;

        const itemsPerPage = 6;
        const currentPage = parseInt(req.query.page) || 1;
        const totalProducts = allVariants.length;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const totalPages = Math.ceil(totalProducts / itemsPerPage);
        const currentVariants = allVariants.slice(startIndex, endIndex);

        const categories = await Category.find({ isListed: true });
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));

        let userData = null;
        if (user) {
            userData = await User.findOne({ _id: user });
            if (userData) {
                const searchEntry = {
                    category: findCategory ? findCategory._id : null,
                    brand: findBrand ? findBrand._id : null,
                    searchedOn: new Date(),
                };
                userData.searchHistory.push(searchEntry);
                await userData.save();
            }
        }

        const cartItemCount = req.session.cartItemCount || 0;
        selectedFilters = req.session.filters;

        res.render('shop', {
            user: userData,
            products: currentVariants,
            category: categories,
            brand: brands,
            totalPages,
            currentPage,
            selectedCategory: categoryName,
            categoriesWithIds,
            selectedBrand: brandName || null,
            totalProducts,
            cartItemCount,
            selectedFilters
        });

    } catch (error) {
        console.error('Shop filter error:', error);
        res.redirect('pageNotFound');
    }
};



const filterByPrice = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = user ? await User.findOne({ _id: user }) : null;

        if (!req.session.filters) {
            req.session.filters = {
                category: null,
                brand: null,
                price: { gt: null, lt: null },
            };
        }

        const priceGt = req.query.gt !== undefined ? req.query.gt : req.session.filters.price.gt;
        const priceLt = req.query.lt !== undefined ? req.query.lt : req.session.filters.price.lt;
        req.session.filters.price = { gt: priceGt, lt: priceLt };

        console.log('Applied Filters:', req.session.filters);

        const blockedBrandNames = await Brand.find({ isBlocked: true }).select('brandName');
        const blockedBrandList = blockedBrandNames.map((brand) => brand.brandName);

        let allVariants = req.session.filteredProducts || [];

        if (allVariants.length > 0) {
            allVariants = allVariants.filter(variant =>
                (!priceGt || variant.variantSalePrice > priceGt) &&
                (!priceLt || variant.variantSalePrice < priceLt)
            );
        } else {
            let query = {
                isBlocked: false,
                brand: { $nin: blockedBrandList }
            };

            const products = await ProductV2.find(query).lean();

            allVariants = products.flatMap(product =>
                product.variants
                    .filter(variant =>
                        (!priceGt || variant.salePrice > priceGt) &&
                        (!priceLt || variant.salePrice < priceLt)
                    )
                    .map(variant => ({
                        _id: product._id,
                        productName: product.productName,
                        description: product.description,
                        brand: product.brand,
                        category: product.category,
                        variantColor: variant.color,
                        variantSize: variant.size,
                        variantStorage: variant.storage,
                        variantRegularPrice: variant.regularPrice,
                        variantSalePrice: variant.salePrice,
                        variantStock: variant.stock,
                        variantImages: variant.images,
                        createdAt: product.createdAt,
                        updatedAt: product.updatedAt,
                    }))
            );

            allVariants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        }

        req.session.filteredProducts = allVariants;

        const itemsPerPage = 6;
        const currentPage = parseInt(req.query.page) || 1;
        const totalProducts = allVariants.length;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const totalPages = Math.ceil(totalProducts / itemsPerPage);
        const currentVariants = allVariants.slice(startIndex, endIndex);

        const brands = await Brand.find({}).lean();
        const categories = await Category.find({ isListed: true }).lean();
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));

        const cartItemCount = req.session.cartItemCount || 0;
        selectedFilters = req.session.filters;

        res.render('shop', {
            user: userData,
            products: currentVariants,
            category: categories,
            brand: brands,
            totalPages,
            currentPage,
            categoriesWithIds,
            totalProducts,
            cartItemCount,
            selectedFilters,
        });

    } catch (error) {
        console.error('Shop filter error:', error);
        res.redirect('pageNotFound');
    }
};


const searchProducts = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = user ? await User.findOne({ _id: user }) : null;
        const search = req.body.query?.trim() || "";

        // Retrieve categories and brands
        const brands = await Brand.find({}).lean();
        const categories = await Category.find({ isListed: true }).lean();
        const categoryIds = categories.map(category => category._id.toString());
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));

        // Retrieve blocked brands
        const blockedBrandNames = await Brand.find({ isBlocked: true }).select('brandName');
        const blockedBrandList = blockedBrandNames.map(brand => brand.brandName);
        console.log('Applied Filters:', req.session.filters);

        let searchResult = [];

        if (req.session.filteredProducts && req.session.filteredProducts.length > 0) {
            // Search within the session-stored products
            searchResult = req.session.filteredProducts.filter(product =>
                product.productName.toLowerCase().includes(search.toLowerCase())
            );
        } else {
            // Query the database if session products are not available
            let query = {
                productName: { $regex: new RegExp(search, "i") },
                isBlocked: false,
                category: { $in: categoryIds },
                brand: { $nin: blockedBrandList },
            };

            const products = await ProductV2.find(query).lean();

            searchResult = products.flatMap(product =>
                product.variants.map(variant => ({
                    _id: product._id,
                    productName: product.productName,
                    description: product.description,
                    brand: product.brand,
                    category: product.category,
                    variantColor: variant.color,
                    variantSize: variant.size,
                    variantStorage: variant.storage,
                    variantRegularPrice: variant.regularPrice,
                    variantSalePrice: variant.salePrice,
                    variantStock: variant.stock,
                    variantImages: variant.images,
                    createdAt: product.createdAt,
                    updatedAt: product.updatedAt,
                }))
            );

            // Store results in session for faster access
            req.session.filteredProducts = searchResult;
        }

        // Sort by last updated timestamp
        searchResult.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        // Pagination
        const itemsPerPage = 6;
        const currentPage = parseInt(req.query.page) || 1;
        const totalProducts = searchResult.length;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const totalPages = Math.ceil(totalProducts / itemsPerPage);
        const currentProduct = searchResult.slice(startIndex, endIndex);

        const cartItemCount = req.session.cartItemCount || 0;

        res.render('shop', {
            user: userData,
            products: currentProduct,
            category: categories,
            brand: brands,
            totalPages,
            currentPage,
            categoriesWithIds,
            totalProducts,
            cartItemCount,
        });

    } catch (error) {
        console.error('Search error:', error);
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
    googleLogin,
    logout,
    loadShopePage,
    filterProduct,
    filterByPrice,
    searchProducts,

}
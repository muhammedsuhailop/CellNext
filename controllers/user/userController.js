const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const ProductV2 = require('../../models/productsSchemaV2');
const Brand = require('../../models/brandSchema');
const Cart = require('../../models/cartSchema');
const Wallet = require('../../models/walletSchema');
const nodemailer = require('nodemailer');
const env = require('dotenv').config();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { getPopularProducts } = require('../../helpers/salesDataHelper');

function generateShortReferralCode(length = 6) {
    return uuidv4().replace(/-/g, '').substring(0, length).toUpperCase();
}

const loadHomePage = async (req, res) => {
    try {
        const user = req.session.user;
        const categories = await Category.find({ isListed: true });
        const productData = await ProductV2.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            variants: {
                $elemMatch: {
                    stock: { $gt: 0 }
                }
            }
        });

        productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
                link: '/filter?brand=Apple'
            }
        ];

        let cartItemCount = req.session.cartItemCount || 0;

        if (user) {
            const userData = await User.findOne({ _id: user });

            let wallet = await Wallet.findOne({ userId: userData._id });
            if (!wallet) {
                wallet = new Wallet({ userId: userData._id, transactions: [] });
                await wallet.save();
                userData.wallet = wallet._id;
                await userData.save();
            }
            if (userData.cart && userData.cart.length > 0) {
                const cart = await Cart.findOne({ _id: userData.cart[0] }).lean();
                if (cart && cart.items && cart.items.length > 0) {
                    cartItemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
                }
            }

            req.session.cartItemCount = cartItemCount;
            cartItemCount = req.session.cartItemCount;

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
    const { name, email, phone, password, confirmPassword, referralCode } = req.body;

    try {
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        const existingUser = await User.findOne({ email });

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
        req.session.referralCode = referralCode || null;
        console.log('referralCode on signup ', req.session.referralCode);
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

            const referralCode = req.session.referralCode;
            if (referralCode) {
                const referrer = await User.findOne({ referralCode });

                if (referrer) {
                    const referrerWallet = await Wallet.findOne({ userId: referrer._id });
                    const referrerBalanceBefore = referrerWallet.balance;
                    const referrerBalanceAfter = referrerBalanceBefore + 300;

                    const referrerTransaction = {
                        transactionId: uuidv4(),
                        type: 'credit',
                        amount: 300,
                        description: `Referral bonus from ${user.name} signup`,
                        orderId: null,
                        transactionCategory: 'referral',
                        balanceAfterTransaction: referrerBalanceAfter,
                    };

                    referrerWallet.transactions.push(referrerTransaction);
                    referrerWallet.balance = referrerBalanceAfter;
                    await referrerWallet.save();

                    const newUserWallet = await Wallet.findOne({ userId: saveUserData._id });
                    const newUserBalanceBefore = newUserWallet.balance;
                    const newUserBalanceAfter = newUserBalanceBefore + 150;

                    const newUserTransaction = {
                        transactionId: uuidv4(),
                        type: 'credit',
                        amount: 150,
                        description: 'Referral bonus for using referral code',
                        orderId: null,
                        transactionCategory: 'referral',
                        balanceAfterTransaction: newUserBalanceAfter,
                    };

                    newUserWallet.transactions.push(newUserTransaction);
                    newUserWallet.balance = newUserBalanceAfter;
                    await newUserWallet.save();

                } else {
                    console.log('Invalid referral code.');
                }
            }

            const newReferralCode = generateShortReferralCode();
            saveUserData.referralCode = newReferralCode;
            await saveUserData.save();

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
        res.redirect('/');
    } catch (error) {
        console.error('login error', error);
        return res.render('login', { message: 'login failed. Please try again later' });
    }
}

const googleLogin = async (req, res) => {
    if (req.user) {
        req.session.user = req.user._id;
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

        req.session.filters = {
            category: null,
            brand: null,
            price: { gt: null, lt: null },
        };
        req.session.filteredProducts = null;
        req.session.searchResult = null;
        req.session.sortBy = null;
        req.session.search = null;

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
            sortBy: req.session.sortBy || null,
            search: req.session.search || null,
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

        if (req.query.clearCategory) {
            req.session.filters.category = null;
        }
        if (req.query.clearBrand) {
            req.session.filters.brand = null;
        }


        const categoryName = req.query.category || req.session.filters.category;
        const brandName = req.query.brand || req.session.filters.brand;
        const priceGt = req.query.gt !== undefined ? req.query.gt : req.session.filters.price.gt;
        const priceLt = req.query.lt !== undefined ? req.query.lt : req.session.filters.price.lt;

        req.session.filters = { category: categoryName, brand: brandName, price: { gt: priceGt, lt: priceLt } };

        const blockedBrandNames = await Brand.find({ isBlocked: true }).select('brandName');
        const blockedBrandList = blockedBrandNames.map(b => b.brandName);

        const findCategory = categoryName ? await Category.findOne({ name: categoryName }) : null;
        const findBrand = brandName ? await Brand.findOne({ brandName }) : null;

        const brands = await Brand.find({}).lean();
        const categories = await Category.find({ isListed: true }).lean();
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));

        let searchResults = req.session.searchResult || [];
        let allVariants = [];

        if (searchResults && searchResults.length > 0) {
            const filteredByCatAndBrand = searchResults.filter(product => {
                let categoryMatch = !findCategory || String(product.category) === String(findCategory._id);
                let brandMatch = !findBrand || product.brand === findBrand.brandName;
                return categoryMatch && brandMatch;
            });
            allVariants = filteredByCatAndBrand.filter(product =>
                (!priceGt || product.variantSalePrice > priceGt) &&
                (!priceLt || product.variantSalePrice < priceLt)
            );
        } else {
            let query = { isBlocked: false, brand: { $nin: blockedBrandList } };
            if (findCategory) query.category = findCategory._id;
            if (findBrand) query.brand = findBrand.brandName;
            const findProducts = await ProductV2.find(query).lean();

            if (findProducts.length === 0) {
                console.log('No products found for the given filters.');
            }

            allVariants = findProducts.flatMap(product =>
                (product.variants || [])
                    .filter(variant =>
                        (!priceGt || variant.salePrice > priceGt) &&
                        (!priceLt || variant.salePrice < priceLt)
                    )
                    .map((variant, variantIndex) => ({
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
                        variantNumber: variantIndex++,
                    }))
            );
        }

        // allVariants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const sortBy = req.session.sortBy || "newest"; // Default sort

        if (sortBy === "popularity") {
            const salesMap = await getPopularProducts();

            allVariants.forEach(product => {
                product.totalSold = salesMap.get(product._id.toString()) || 0;
            });

            allVariants.sort((a, b) => b.totalSold - a.totalSold);
        } else {
            switch (sortBy) {
                case "price-low-high":
                    allVariants.sort((a, b) => a.variantSalePrice - b.variantSalePrice);
                    break;
                case "price-high-low":
                    allVariants.sort((a, b) => b.variantSalePrice - a.variantSalePrice);
                    break;
                case "newest":
                    allVariants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                case "oldest":
                    allVariants.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    break;
                default:
                    break;
            }
        }


        req.session.filteredProducts = allVariants;

        const itemsPerPage = 6;
        const currentPage = parseInt(req.query.page) || 1;
        const totalProducts = allVariants.length;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const totalPages = Math.ceil(totalProducts / itemsPerPage);
        const currentVariants = allVariants.slice(startIndex, startIndex + itemsPerPage);

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
        const selectedFilters = req.session.filters;

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
            selectedFilters,
            sortBy: req.session.sortBy || null,
            search: req.session.search || null,
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

        if (req.query.clearPrice) {
            req.session.filters.price = { gt: null, lt: null };
        }

        const categoryName = req.query.category || req.session.filters.category;
        const brandName = req.query.brand || req.session.filters.brand;
        const priceGt = req.query.gt !== undefined ? req.query.gt : req.session.filters.price.gt;
        const priceLt = req.query.lt !== undefined ? req.query.lt : req.session.filters.price.lt;

        req.session.filters = {
            category: categoryName,
            brand: brandName,
            price: { gt: priceGt, lt: priceLt }
        };


        const blockedBrandNames = await Brand.find({ isBlocked: true }).select('brandName');
        const blockedBrandList = blockedBrandNames.map(b => b.brandName);

        const findCategory = categoryName ? await Category.findOne({ name: categoryName }) : null;
        const findBrand = brandName ? await Brand.findOne({ brandName }) : null;

        let allVariants = [];
        let searchResults = req.session.searchResult || [];

        if (searchResults && searchResults.length > 0) {
            allVariants = searchResults.filter(product => {
                let categoryMatch = !findCategory || String(product.category) === String(findCategory._id);
                let brandMatch = !findBrand || product.brand === findBrand.brandName;
                let priceMatch = (!priceGt || product.variantSalePrice > priceGt) &&
                    (!priceLt || product.variantSalePrice < priceLt);
                return categoryMatch && brandMatch && priceMatch;
            });
        } else {
            let query = { isBlocked: false, brand: { $nin: blockedBrandList } };
            if (findCategory) query.category = findCategory._id;
            if (findBrand) query.brand = findBrand.brandName;
            const products = await ProductV2.find(query).lean();

            allVariants = products.flatMap(product =>
                (product.variants || [])
                    .filter(variant =>
                        (!priceGt || variant.salePrice > priceGt) &&
                        (!priceLt || variant.salePrice < priceLt)
                    )
                    .map((variant, variantIndex) => ({
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
                        variantNumber: variantIndex++,
                    }))
            );
            const sortBy = req.session.sortBy || "newest";

            if (sortBy === "popularity") {
                const salesMap = await getPopularProducts();

                products.forEach(product => {
                    product.totalSold = salesMap.get(product._id.toString()) || 0;
                });

                products.sort((a, b) => b.totalSold - a.totalSold);
            } else {
                switch (sortBy) {
                    case "price-low-high":
                        products.sort((a, b) => a.variantSalePrice - b.variantSalePrice);
                        break;
                    case "price-high-low":
                        products.sort((a, b) => b.variantSalePrice - a.variantSalePrice);
                        break;
                    case "newest":
                        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                        break;
                    case "oldest":
                        products.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                        break;
                    default:
                        break;
                }
            }
        }

        req.session.filteredProducts = allVariants;

        const itemsPerPage = 6;
        const currentPage = parseInt(req.query.page) || 1;
        const totalProducts = allVariants.length;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const totalPages = Math.ceil(totalProducts / itemsPerPage);
        const currentVariants = allVariants.slice(startIndex, startIndex + itemsPerPage);

        const allBrands = await Brand.find({}).lean();
        const allCategories = await Category.find({ isListed: true }).lean();
        const categoriesWithIds = allCategories.map(category => ({ _id: category._id, name: category.name }));

        const cartItemCount = req.session.cartItemCount || 0;
        const selectedFilters = req.session.filters;

        res.render('shop', {
            user: userData,
            products: currentVariants,
            category: allCategories,
            brand: allBrands,
            totalPages,
            currentPage,
            categoriesWithIds,
            totalProducts,
            cartItemCount,
            selectedFilters,
            sortBy: req.session.sortBy || null,
            search: req.session.search || null,
        });

    } catch (error) {
        console.error('Shop filter error:', error);
        res.redirect('pageNotFound');
    }
};

const processSearch = async (req, res) => {
    try {
        const search = req.body.query?.trim() || "";

        req.session.searchQuery = search;

        res.redirect('/search');
    } catch (error) {
        console.error("Error processing search:", error);
        res.redirect('pageNotFound');
    }
};


const searchProducts = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = user ? await User.findOne({ _id: user }) : null;

        const search = req.session.searchQuery || "";
        req.session.search = search;

        req.session.filters = {
            category: null,
            brand: null,
            price: { gt: null, lt: null }
        };
        req.session.filteredProducts = null;

        const brands = await Brand.find({}).lean();
        const categories = await Category.find({ isListed: true }).lean();
        const categoryIds = categories.map(category => category._id.toString());
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));

        const blockedBrandNames = await Brand.find({ isBlocked: true }).select('brandName');
        const blockedBrandList = blockedBrandNames.map(brand => brand.brandName);

        let query = {
            productName: { $regex: new RegExp(search, "i") },
            isBlocked: false,
            category: { $in: categoryIds },
            brand: { $nin: blockedBrandList },
        };

        const products = await ProductV2.find(query).lean();

        let searchResult = products.flatMap(product =>
            product.variants.map((variant, variantIndex) => ({
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
                sortBy: req.session.sortBy || null,
                variantNumber: variantIndex++,
            }))
        );

        req.session.searchResult = searchResult;

        const sortBy = req.session.sortBy || "newest";

        if (sortBy === "popularity") {
            const salesMap = await getPopularProducts();

            products.forEach(product => {
                product.totalSold = salesMap.get(product._id.toString()) || 0;
            });

            products.sort((a, b) => b.totalSold - a.totalSold);
        } else {
            switch (sortBy) {
                case "price-low-high":
                    products.sort((a, b) => a.variantSalePrice - b.variantSalePrice);
                    break;
                case "price-high-low":
                    products.sort((a, b) => b.variantSalePrice - a.variantSalePrice);
                    break;
                case "newest":
                    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                case "oldest":
                    products.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    break;
                default:
                    break;
            }
        }

        const itemsPerPage = 6;
        const currentPage = parseInt(req.query.page) || 1;
        const totalProducts = searchResult.length;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const totalPages = Math.ceil(totalProducts / itemsPerPage);
        const currentProduct = searchResult.slice(startIndex, startIndex + itemsPerPage);

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
            selectedFilters: req.session.filters,
            sortBy: req.session.sortBy || null,
            search: req.session.search || null,
        });
    } catch (error) {
        console.error('Search error:', error);
        res.redirect('pageNotFound');
    }
};

const sortShopProducts = async (req, res) => {
    try {
        const { sortBy } = req.query;
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });

        if (sortBy) {
            req.session.sortBy = sortBy;
        }

        const currentSortBy = req.session.sortBy || "price-low-high";
        let products = req.session.filteredProducts || req.session.searchResult;

        if (!products || products.length === 0) {
            const blockedBrandNames = await Brand.find({ isBlocked: true });
            const blockedBrandList = blockedBrandNames.map((brand) => brand.brandName);
            const categories = await Category.find({ isListed: true });
            const categoryIds = categories.map(category => category._id.toString());

            const allProducts = await ProductV2.find({
                isBlocked: false,
                category: { $in: categoryIds },
                brand: { $nin: blockedBrandList },
            }).lean();

            products = allProducts.flatMap(product =>
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
                    variantNumber: variantIndex++,
                }))
            );
        }

        if (currentSortBy === "popularity") {
            const salesMap = await getPopularProducts();

            products.forEach(product => {
                product.totalSold = salesMap.get(product._id.toString()) || 0;
            });

            products.sort((a, b) => b.totalSold - a.totalSold);
        } else {
            switch (currentSortBy) {
                case "price-low-high":
                    products.sort((a, b) => a.variantSalePrice - b.variantSalePrice);
                    break;
                case "price-high-low":
                    products.sort((a, b) => b.variantSalePrice - a.variantSalePrice);
                    break;
                case "newest":
                    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                case "oldest":
                    products.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    break;
                default:
                    break;
            }
        }
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;
        const paginatedProducts = products.slice(skip, skip + limit);
        const totalPages = Math.ceil(products.length / limit);

        const brands = await Brand.find({ isBlocked: false });
        const categories = await Category.find({ isListed: true });
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }));
        const cartItemCount = req.session.cartItemCount || 0;

        res.render("shop", {
            user: userData,
            products: paginatedProducts,
            brand: brands,
            totalProducts: products.length,
            currentPage: page,
            totalPages: totalPages,
            categoriesWithIds: categoriesWithIds,
            cartItemCount,
            selectedFilters: req.session.filters,
            sortBy: currentSortBy,
            search: req.session.search || null,
        });

    } catch (error) {
        console.error("Sorting error:", error);
        res.redirect("pageNotFound");
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
    processSearch,
    sortShopProducts,

}
const Category = require('../../models/categorySchema');
const ProductV2 = require('../../models/productsSchemaV2');
const Coupon = require('../../models/couponSchema');
const formatDate = require('../../helpers/formatDate');

const loadAddCoupon = async (req, res) => {
    try {
        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');
        const products = await ProductV2.find({}).select('_id productName');
        const categories = await Category.find({}).select('_id name');

        res.render('coupon-add', {
            products,
            categories,
            messages: {
                success: successMessage.length > 0 ? successMessage[0] : null,
                error: errorMessage.length > 0 ? errorMessage[0] : null,
            },
        });
    } catch (error) {
        console.error('Error on add coupon page', error);
        res.redirect('/admin/error-page');
    }
}

const addCoupon = async (req, res) => {
    try {
        const { name, startOn, expireOn, discountType, discountValue, isActive, maxDiscount, minimumOrderAmount, usageLimitPerUser, totalUsageLimit, applicableCategories, applicableProducts } = req.body;

        if (!name || !startOn || !expireOn || !discountType || !discountValue || isActive === undefined || !minimumOrderAmount || !usageLimitPerUser || !applicableProducts || !applicableCategories) {
            return res.status(400).json({ error: 'All required fields must be provided.' });
        }

        const existingCoupon = await Coupon.findOne({ name });
        if (existingCoupon) {
            return res.status(400).json({ error: 'Coupon with this name already exists.' });
        }

        if (new Date(startOn) >= new Date(expireOn)) {
            return res.status(400).json({ error: 'Start date must be before the expiration date.' });
        }

        if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
            return res.status(400).json({ error: 'Percentage discount must be between 0 and 100.' });
        }

        if (maxDiscount && maxDiscount < 0) {
            return res.status(400).json({ error: 'Maximum discount must be a positive value.' });
        }

        const coupon = new Coupon({
            name,
            startOn,
            expireOn,
            discountType,
            discountValue,
            isActive,
            maxDiscount,
            minimumOrderAmount,
            usageLimitPerUser,
            totalUsageLimit,
            applicableCategories,
            applicableProducts
        });

        await coupon.save();

        res.status(201).json({ message: 'Coupon created successfully', coupon });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create coupon.' });
    }
}

const getAllCoupons = async (req, res) => {
    try {
        let search = req.query.search || '';
        let page = parseInt(req.query.page) || 1;
        const limit = 4;

        if (page < 1) page = 1;

        const searchCondition = search ? { name: { $regex: search, $options: 'i' } } : {};

        const couponData = await Coupon.find(searchCondition)
            .sort({ name: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const currentDate = new Date();
        for (const coupon of couponData) {
            if (coupon.expireOn < currentDate && coupon.isActive) {
                coupon.isActive = false;
                await coupon.save();
            }
        }

        const count = await Coupon.countDocuments(searchCondition);
        const totalPages = Math.ceil(count / limit);

        if (page > totalPages) page = totalPages;

        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');

        const allProducts = await ProductV2.find({});
        const allCategories = await Category.find({});

        const formattedCoupons = couponData.map(coupon => {
            let applicableProducts = coupon.applicableProducts;
            if (applicableProducts.length === allProducts.length) {
                applicableProducts = 'All';
            } else {
                applicableProducts = allProducts.filter(product =>
                    applicableProducts.includes(product._id.toString())
                ).map(product => product.productName);
            }

            let applicableCategories = coupon.applicableCategories;
            if (applicableCategories.length === allCategories.length) {
                applicableCategories = 'All';
            } else {
                applicableCategories = allCategories.filter(category =>
                    applicableCategories.includes(category._id.toString())
                ).map(category => category.name);
            }

            return {
                ...coupon.toObject(),
                formattedStartOn: formatDate.formatddmmyy(coupon.startOn),
                formattedExpireOn: formatDate.formatddmmyy(coupon.expireOn),
                applicableProducts,
                applicableCategories
            };
        });


        res.render('coupons', {
            data: formattedCoupons,
            totalPages: totalPages,
            currentPage: page,
            searchQuery: search,
            searchAction: '/admin/coupons',
            messages: {
                success: successMessage.length > 0 ? successMessage[0] : null,
                error: errorMessage.length > 0 ? errorMessage[0] : null,
            },
        });
    } catch (error) {
        console.error('Error on coupon page', error);
        res.redirect('/admin/error-page');
    }
}

const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.query.id;
        if (!couponId) return res.status(400).json({ error: "Invalid coupon ID" });

        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
        if (!deletedCoupon) return res.status(404).json({ error: "Coupon not found" });

        res.status(200).json({ message: "Coupon deleted successfully" });
    } catch (error) {
        console.error("Error deleting coupon:", error);
        res.status(500).json({ error: "Something went wrong" });
    }
}

module.exports = {
    loadAddCoupon,
    addCoupon,
    getAllCoupons,
    deleteCoupon
}
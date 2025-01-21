const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Brand = require('../../models/brandSchema');

const productDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const productId = req.query.id;
        const product = await Product.findById(productId);
        const findCategory = await Category.findOne({ _id: product.category });
        const categoryOffer = findCategory?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;
        const totalDiscountPercentage = (((product.regularPrice - product.salePrice) / product.regularPrice) * 100).toFixed(0);

        let relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: productId },
            isBlocked: false
        })
            .limit(4)
            .lean();

        if (relatedProducts.length < 4) {
            const additionalProducts = await Product.find({
                brand: product.brand,
                _id: { $nin: [productId, ...relatedProducts.map((p) => p._id)] },
                isBlocked: false
            })
                .limit(4 - relatedProducts.length)
                .lean();

            relatedProducts = [...relatedProducts, ...additionalProducts];
        }

        res.render('product-details', {
            user: userData,
            product: product,
            quantity: product.quantity,
            totalDiscountPercentage,
            categoryOffer,
            category: findCategory,
            relatedProducts
        });
    } catch (error) {
        console.error('search error:', error);
        res.redirect('pageNotFound');
    }
}

module.exports = {
    productDetails,
}
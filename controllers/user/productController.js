const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const ProductV2 = require('../../models/productsSchemaV2');
const Brand = require('../../models/brandSchema');

const productDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = userId ? await User.findById(userId) : null;
        const productId = req.query.id;
        const variantIndex = parseInt(req.query.variant) || 0

        const product = await ProductV2.findById(productId).lean();
        if (!product) {
            return res.redirect('pageNotFound');
        }

        const selectedVariant = product.variants[variantIndex];
        if (!selectedVariant) {
            return res.redirect('pageNotFound');
        }

        const findCategory = await Category.findOne({ _id: product.category });
        const categoryOffer = findCategory?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;
        const totalDiscountPercentage = (
            ((selectedVariant.regularPrice - selectedVariant.salePrice) / selectedVariant.regularPrice) * 100
        ).toFixed(0);

        const otherVariants = product.variants
            .filter((variant, index) => index !== variantIndex)
            .map((variant) => ({
                ...product,
                variants: [variant],
                isVariant: true,
            }));

        let relatedProducts = await ProductV2.find({
            category: product.category,
            _id: { $ne: productId },
            isBlocked: false,
        })
            .limit(4 - otherVariants.length)
            .lean();

        relatedProducts = relatedProducts.map((product) => ({
            ...product,
            isVariant: false,
        }));

        if (relatedProducts.length + otherVariants.length < 4) {
            const additionalProducts = await ProductV2.find({
                brand: product.brand,
                _id: { $nin: [productId, ...relatedProducts.map((p) => p._id)] },
                isBlocked: false,
            })
                .limit(4 - (relatedProducts.length + otherVariants.length))
                .lean();

            relatedProducts = [...relatedProducts, ...additionalProducts];
        }

        const finalRelatedProducts = [...otherVariants, ...relatedProducts];
        console.log('finalRelatedProducts', finalRelatedProducts);

        res.render('product-details', {
            user: userData,
            product: product,
            variant: selectedVariant,
            quantity: selectedVariant.stock,
            totalDiscountPercentage,
            categoryOffer,
            category: findCategory,
            relatedProducts: finalRelatedProducts

        });
    } catch (error) {
        console.error('Product details error:', error);
        res.redirect('pageNotFound');
    }
};


module.exports = {
    productDetails,
}
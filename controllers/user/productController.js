const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const ProductV2 = require('../../models/productsSchemaV2');
const Brand = require('../../models/brandSchema');

const productDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = userId ? await User.findById(userId) : null;
        const productId = req.query.id; // Product ID
        const variantIndex = parseInt(req.query.variant); // Variant index

        // Fetch the product by ID
        const product = await ProductV2.findById(productId).lean();
        if (!product) {
            return res.redirect('pageNotFound');
        }

        // Fetch the selected variant
        const selectedVariant = product.variants[variantIndex];
        if (!selectedVariant) {
            return res.redirect('pageNotFound');
        }

        // Fetch the category and offers
        const findCategory = await Category.findOne({ _id: product.category });
        const categoryOffer = findCategory?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;
        const totalDiscountPercentage = (
            ((selectedVariant.regularPrice - selectedVariant.salePrice) / selectedVariant.regularPrice) * 100
        ).toFixed(0);

        // Fetch related products from the same category
        let relatedProducts = await ProductV2.find({
            category: product.category,
            _id: { $ne: productId },
            isBlocked: false,
        })
            .limit(4)
            .lean();

        // If fewer than 4 related products, fetch additional products by brand
        if (relatedProducts.length < 4) {
            const additionalProducts = await ProductV2.find({
                brand: product.brand,
                _id: { $nin: [productId, ...relatedProducts.map((p) => p._id)] },
                isBlocked: false,
            })
                .limit(4 - relatedProducts.length)
                .lean();

            relatedProducts = [...relatedProducts, ...additionalProducts];
        }

        // Render the product details page
        res.render('product-details', {
            user: userData,
            product: product,
            variant: selectedVariant, // Pass the selected variant
            quantity: selectedVariant.stock,
            totalDiscountPercentage,
            categoryOffer,
            category: findCategory,
            relatedProducts,
        });
    } catch (error) {
        console.error('Product details error:', error);
        res.redirect('pageNotFound');
    }
};


module.exports = {
    productDetails,
}
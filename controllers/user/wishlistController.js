const User = require('../../models/userSchema');
const ProductV2 = require('../../models/productsSchemaV2');
const Wishlist = require('../../models/wishlistSchema');

const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);

        let wishlist = await Wishlist.findOne({ userId }).populate({
            path: 'items.productId',
            model: 'ProductV2',
        });

        if (!wishlist) {
            wishlist = new Wishlist({
                userId: userId,
                items: [],
            });
            await wishlist.save();
            await User.findByIdAndUpdate(userId, { $push: { wishlist: wishlist._id } });
        }

        let totalWishlistPrice = 0;

        const wishlistItems = await Promise.all(
            wishlist.items.map(async (item) => {
                const product = await ProductV2.findById(item.productId);

                if (!product || !product.variants[item.variantIndex]) {
                    return null;
                }

                const variant = product.variants[item.variantIndex];
                const salePrice = variant.salePrice;

                totalWishlistPrice += salePrice;

                return {
                    user: userData,
                    productId: product._id,
                    variantId: item.variantIndex,
                    name: product.productName,
                    image: variant.images[0] || "/img/no-image.png",
                    price: variant.salePrice,
                    color: variant.color || 'NA',
                    size: variant.size || 'NA',
                    quantity: 1,
                    regularPrice: variant.regularPrice,
                    total: salePrice,
                };
            })
        );

        const cartItemCount = req.session.cartItemCount || 0;

        console.log('wishlistItems', wishlistItems)

        res.render('wishlist', {
            wishlistItems: wishlistItems.filter(item => item !== null),
            user: userData,
            cartItemCount,
            total: totalWishlistPrice,
        });
    } catch (error) {
        console.error('Error loading wishlist:', error);
        res.status(500).send('Internal Server Error');
    }
}

const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId, variantIndex } = req.body;

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({
                userId: userId,
                items: [],
            });
            await wishlist.save();
            await User.findByIdAndUpdate(userId, { $push: { wishlist: wishlist._id } });
        }
        const itemExists = wishlist.items.some(
            item => item.productId.toString() === productId.toString() && item.variantIndex === variantIndex
        );

        if (itemExists) {
            return res.json({ success: true, message: 'Item already exists in the wishlist.' });
        }

        wishlist.items.push({ productId, variantIndex, addedOn: Date.now() });

        await wishlist.save();

        res.json({ success: true, message: 'Item added to wishlist successfully.' });
    } catch (error) {
        console.error('Error adding item to wishlist:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}

removeProductFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.session.user;

        const updatedWishlist = await Wishlist.findOneAndUpdate(
            { userId },
            { $pull: { items: { productId } } },
            { new: true }
        ).populate('items.productId');

        if (!updatedWishlist) {
            return res.status(404).json({ message: "Wishlist not found" });
        }

        const wishlistItemCount = updatedWishlist.items.length;
        req.session.wishlistItemCount = wishlistItemCount;

        return res.status(200).json({
            message: "Product removed from wishlist successfully",
            wishlist: updatedWishlist,
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: "Failed to remove product from wishlist" });
    }
}

module.exports = {
    loadWishlist,
    addToWishlist,
    removeProductFromWishlist,
}

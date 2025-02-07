const User = require('../../models/userSchema');
const ProductV2 = require('../../models/productsSchemaV2');
const Wishlist = require('../../models/wishlistSchema');

const loadWishList = async (req, res) => {
    try {

    } catch (error) {

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

module.exports = {
    loadWishList,
    addToWishlist
}

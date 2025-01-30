const ProductV2 = require('../../models/productsSchemaV2');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');

const getCheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const addressData = await Address.findOne({ userId: userData._id });
        const cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            return res.status(404).send('Cart not found');
        }

        console.log('cart:', cart);

        const products = await ProductV2.find({
            '_id': { $in: cart.items.map(item => item.productId) }
        });

        const cartItems = cart.items.map(item => {
            const product = products.find(p => p._id.toString() === item.productId.toString());

            if (!product) {
                console.error(`Product not found for ID: ${item.productId}`);
                return null;
            }

            let variant;
            if (item.variantId >= 0 && item.variantId < product.variants.length) {
                variant = product.variants[item.variantId];
            }

            if (!variant) {
                console.error(`Variant not found for ID: ${item.variantId}`);
                return null;
            }

            console.log('Product:', product);
            console.log('Variant:', variant);

            return {
                ...item,
                name: product.productName,
                price: variant.salePrice || variant.regularPrice,
                total: (variant.salePrice || variant.regularPrice) * item.quantity,
                quantity: item.quantity,
            };
        }).filter(item => item !== null);

        const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);

        console.log('Cart Items:', cartItems);


        res.render('checkout', {
            user: userData,
            addressData: addressData,
            cartItems,
            subtotal,
            total: subtotal
        })
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching cart data');
    }
}

module.exports = {
    getCheckout,
}
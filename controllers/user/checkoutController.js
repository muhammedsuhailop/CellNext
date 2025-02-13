const ProductV2 = require('../../models/productsSchemaV2');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Coupon = require('../../models/couponSchema');

const getCheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const addressData = await Address.findOne({ userId: userData._id });
        const cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            return res.status(404).send('Cart not found');
        }

        const validCart = cart.items.filter(item => item.quantity > 0);
        if (validCart.length === 0) {
            req.flash('message', 'Cannot proceed to checkout. Cart is empty or items are out of stock.');
            res.redirect('/cart');
        }

        const coupon = await Coupon.findById(cart.coupon);
        let couponName = null;
        if (coupon) {
            couponName = coupon.name;
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

            if (item.quantity === 0) {
                console.error(`Ignoring as quantity is 0`);
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
                price: variant.salePrice,
                total: (variant.salePrice) * item.quantity,
                quantity: item.quantity,
            };
        }).filter(item => item !== null);

        const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
        const total = cart.total;
        const deliveryCharge = cart.deliveryCharge;
        couponDiscount = subtotal - total;
        const cartItemCount = req.session.cartItemCount || 0;

        res.render('checkout', {
            user: userData,
            addressData: addressData,
            cartItems,
            subtotal,
            total,
            cartItemCount,
            couponName: couponName || 'NA',
            couponDiscount,
            deliveryCharge
        })
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching cart data');
    }
}

module.exports = {
    getCheckout,
}
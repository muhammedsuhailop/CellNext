const ProductV2 = require('../../models/productsSchemaV2');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');

const loadCartPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const cart = await Cart.findOne({ userId: userId }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.render('cart', {
                user: userData,
                cartItems: [],
                totalAmount: 0
            });
        }

        const cartItems = cart.items.map((item) => {
            const product = item.productId;
            const variant = product.variants[item.variantId];

            return {
                productId: product._id,
                variantId: item.variantId,
                name: product.name,
                image: variant ? variant.images[0] : '/img/no-image.png',
                price: variant ? variant.salePrice : 0,
                quantity: item.quantity,
                total: variant ? item.quantity * variant.salePrice : 0,
            };
        });

        const totalAmount = cartItems.reduce((acc, item) => acc + item.total, 0);

        res.render('cart', {
            cartItems,
            totalAmount,
            user: userData
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching cart data');
    }
}

const addToCart = async (req, res) => {
    try {
        console.log('In Add to cart...')
        const { productId, variantId, quantity } = req.body;
        const userId = req.session.user;

        const product = await ProductV2.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const variant = product.variants[variantId];
        if (!variant) {
            return res.status(404).json({ success: false, message: 'Variant not found' });
        }

        if (quantity > variant.stock) {
            return res.status(400).json({
                success: false,
                message: `Not enough stock available for this variant. Only ${variant.stock} item(s) left in stock.`
            });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const existingItem = cart.items.find(item => item.productId.toString() === productId && item.variantId === variantId);

        if (existingItem) {
            if (existingItem.quantity + quantity > variant.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Item in cart!. Insufficient stock `
                });
            }
            if (existingItem.quantity + quantity > 5) {
                return res.status(400).json({
                    success: false,
                    message: `Item in cart!. Maximum cart quantity: 5`
                });
            }
            existingItem.quantity += quantity;
        } else {
            cart.items.push({ productId, variantId, quantity });
        }

        await cart.save();

        res.json({ success: true, message: 'Successfully added to cart.', cart });
    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    };
}

const removeProductFromCart = async (req, res) => {
    try {
        const { productId } = req.params;
        const { variantId } = req.query;

        await Cart.updateOne(
            { userId: req.session.user },
            { $pull: { items: { productId, variantId: parseInt(variantId) } } }
        );

        return res.status(200).json({ message: "Item removed successfully" });
    } catch (error) {
        console.log('Error:', error);
        res.status(500).json({ error: "Failed to remove item" });
    }
}

module.exports = {
    addToCart,
    loadCartPage,
    removeProductFromCart,
}
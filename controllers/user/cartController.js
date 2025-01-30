const ProductV2 = require('../../models/productsSchemaV2');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');

const loadCartPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const cart = await Cart.findOne({ userId: userId }).populate('items.productId');
        let outOfStockMessage = null;

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

            if (!variant || variant.stock <= 0) {
                item.quantity = 0;
                total = 0;
                outOfStockMessage = "Some items in your cart are out of stock and have been set to zero.";
            }

            const itemTotal = variant ? item.quantity * variant.salePrice : 0;

            return {
                productId: product._id,
                variantId: item.variantId,
                name: product.productName,
                color: variant.color,
                size: variant ? variant.size : 'NA',
                image: variant ? variant.images[0] : '/img/no-image.png',
                price: variant ? variant.salePrice : 0,
                quantity: item.quantity,
                total: itemTotal,
            };
        });

        const totalAmount = cartItems.reduce((acc, item) => acc + item.total, 0);

        res.render('cart', {
            cartItems,
            totalAmount,
            user: userData,
            outOfStockMessage
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

        console.log({ productId, variantId, quantity });

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
            await cart.save();

            await User.findByIdAndUpdate(userId, {
                $push: { cart: cart._id }
            });
        }

        const existingItem = cart.items.find(item => item.productId.toString() === productId && item.variantId === variantId);
        let cartSubTotal = 0;

        if (existingItem) {
            if (existingItem.quantity + quantity > 5) {
                return res.status(400).json({
                    success: false,
                    message: `Maximum cart quantity: 5`
                });
            }
            if (existingItem.quantity + quantity > variant.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Item in cart!. Insufficient stock`
                });
            }
            existingItem.quantity += quantity;
            const itemTotal = variant.salePrice * existingItem.quantity;

            cartSubTotal = cart.items.reduce((acc, item) => acc + (variant.salePrice * item.quantity), 0);
        } else {
            const itemTotal = variant.salePrice * quantity;
            cart.items.push({ productId, variantId, quantity, itemTotal });
            cartSubTotal = cart.items.reduce((acc, item) => acc + (variant.salePrice * item.quantity), 0);
        }


        cart.subTotal = cartSubTotal;
        cart.total = cartSubTotal;

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
        const userId = req.session.user;

        const cart = await Cart.findOne({ userId });

        await Cart.updateOne(
            { userId: req.session.user },
            { $pull: { items: { productId, variantId: parseInt(variantId) } } }
        );

        let totalAmount = 0;
        for (let item of cart.items) {
            const product = await ProductV2.findById(item.productId);
            const variant = product.variants[item.variantId];

            if (!variant || variant.stock <= 0) {
                item.quantity = 0;
            }

            const itemTotal = variant ? item.quantity * variant.salePrice : 0;
            totalAmount += itemTotal;
        }


        cart.subTotal = totalAmount;
        cart.total = totalAmount;

        await cart.save();

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
const ProductV2 = require('../../models/productsSchemaV2');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Orders = require('../../models/orderSchema');

const placeOrder = async (req, res) => {
    try {
        const { selectedAddress, orderDetails, paymentMethod } = req.body;

        const ordDetails = orderDetails || 'No additional details provided.';

        console.log('Order Body:', selectedAddress, orderDetails, paymentMethod);
        if (!selectedAddress || !ordDetails || !paymentMethod) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        const userId = req.session.user;

        const user = await User.findById(userId).populate('cart');

        if (!user || !user.cart || user.cart.length === 0 || user.cart[0].items.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty or invalid.' });
        }

        const cart = user.cart[0];
        const cartItems = cart.items;

        let totalPrice = 0;

        const products = await ProductV2.find({
            '_id': { $in: cartItems.map(item => item.productId) }
        });

        for (const item of cartItems) {
            const productIdStr = item.productId.toString().trim();
            const product = products.find(p => p._id.toString().trim() === productIdStr);
            console.log('product in for loop', product);

            if (!product) {
                console.error(`Product not found for ID: ${productIdStr}`);
                console.error('Fetched Products:', products.map(p => p._id.toString().trim()));
                console.error('Cart Items:', cartItems.map(item => item._id.toString().trim()));
                return res.status(400).json({ success: false, message: "One or more products not found." });
            }

            let variant;
            variant = product.variants[item.variantId];
            console.log('variant in for loop', variant, "id", item.variantId)

            if (!variant) {
                console.error(`Variant not found for ID: ${item.variantId} in product: ${product.name}`);
                return res.status(400).json({ success: false, message: `Selected variant not found for ${product.name}.` });
            }

            if (item.quantity > 5) {
                return res.status(400).json({ success: false, message: `Maximum cart quantity for ${product.name}: 5` });
            }

            if (item.quantity > variant.stock) {
                return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
            }

            totalPrice += item.quantity * (variant.salePrice || variant.regularPrice);
        }

        const newOrder = new Orders({
            userId: userId,
            orderItems: cartItems.map(item => ({
                productId: item._id,
                variantId: item.variantId,
                quantity: item.quantity,
            })),
            totalPrice: totalPrice,
            finalAmount: totalPrice,
            address: selectedAddress,
            orderDetails: ordDetails,
            payment: {
                amountPaid: totalPrice,
                method: paymentMethod,
                status: 'Pending',
            },
            status: 'Pending',
        });

        await newOrder.save();

        const order_id = newOrder._id;
        const orderId = newOrder.orderId;
        await User.findByIdAndUpdate(userId, {
            $push: { orderHistory: order_id }
        });

        for (const item of cartItems) {
            await ProductV2.findOneAndUpdate(
                { _id: item.productId },
                { $inc: { [`variants.${item.variantId}.stock`]: -item.quantity } }
            );
        }

        cart.items = [];
        cart.subTotal = 0;
        cart.total = 0;
        await cart.save();

        res.json({ success: true, message: 'Order placed successfully!', orderId });
    } catch (error) {
        console.log('Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

module.exports = {
    placeOrder,
}
const ProductV2 = require('../../models/productsSchemaV2');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');

const loadCartPage = async(req,res)=>{
    try {
        const user = req.session.user;
        const userData = await User.findById(user);

        res.render('cart',{
            user: userData,
        })
    } catch (error) {
        
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

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const existingItem = cart.items.find(item => item.productId.toString() === productId && item.variantId === variantId);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({ productId, variantId, quantity });
        }

        await cart.save();

        res.json({ success: true, cart });
    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    };
}


module.exports = {
    addToCart,
    loadCartPage
}
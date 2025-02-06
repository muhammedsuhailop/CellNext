const ProductV2 = require('../../models/productsSchemaV2');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Orders = require('../../models/orderSchema');
const Coupon = require('../../models/couponSchema');
const formatDate = require('../../helpers/formatDate');
const Wallet = require('../../models/walletSchema');


const loadWalletPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const cartItemCount = req.session.cartItemCount || 0;
        const wallet = await Wallet.findOne({ userId: userId })
            .populate('transactions.orderId')
            .exec();

        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found.' });
        }

        res.render('wallet', {
            user: userData,
            cartItemCount,
            wallet
        });

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.redirect('/pageNotFound');
    }

}

module.exports = {
    loadWalletPage,
}
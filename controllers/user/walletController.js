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
        let wallet = await Wallet.findOne({ userId: userId })
            .populate('transactions.orderId')
            .exec();

        if (!wallet) {
            console.log("No wallet found, creating new wallet...");
            wallet = new Wallet({ userId: userId, transactions: [] });
            await wallet.save();
            userData.wallet = wallet._id;
            await userData.save();
            console.log("Wallet created successfully.");
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;
        const totalTransactions = wallet.transactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);

        const transactions = wallet.transactions
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(skip, skip + limit);

        res.render('wallet', {
            user: userData,
            cartItemCount,
            wallet,
            transactions,
            currentPage: page,
            totalPages,
        });

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.redirect('/pageNotFound');
    }

}

module.exports = {
    loadWalletPage,
}
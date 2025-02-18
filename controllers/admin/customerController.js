const User = require('../../models/userSchema');
const env = require('dotenv').config();
const bcrypt = require('bcrypt');

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || '';
        let page = parseInt(req.query.page) || 1;
        const limit = 6;
        if (page < 1) page = 1;
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: '.*' + search + '.*' } },
                { email: { $regex: '.*' + search + '.*' } }
            ]
        })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
        console.log('Page :', page)

        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: '.*' + search + '.*', $options: 'i' } },
                { email: { $regex: '.*' + search + '.*', $options: 'i' } }
            ]
        });

        const totalPages = Math.ceil(count / limit);
        if (page > totalPages) page = totalPages;
        const admin = await User.findById(req.session._id);

        res.render('customers', {
            admin,
            data: userData,
            totalPages: totalPages,
            currentPage: page,
            searchQuery: search,
            searchAction: '/admin/users',
        });
    } catch (error) {
        console.error('Error on customers page', error);
        res.redirect('/admin/error-page');
    }
}

const blockCustomer = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const result = await User.updateOne({ _id: id }, { $set: { isBlocked: true } });

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'User blocked successfully' });
    } catch (error) {
        console.error('Error in blocking user:', error);
        res.status(500).json({ error: 'Failed to block user' });
    }
};


const unblockCustomer = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'User ID is missing' });
        }

        const result = await User.updateOne({ _id: id }, { $set: { isBlocked: false } });

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'User unblocked successfully' });
    } catch (error) {
        console.log('Error in unblocking user:', error);
        res.status(500).json({ error: 'Failed to unblock user' });
    }
};



module.exports = {
    customerInfo,
    blockCustomer,
    unblockCustomer,
}
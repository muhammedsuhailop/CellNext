const User = require('../../models/userSchema');
const env = require('dotenv').config();
const bcrypt = require('bcrypt');

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || '';
        let page = parseInt(req.query.page) || 1;
        const limit = 4;
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


        res.render('customers', {
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
        let id = req.query.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect('/admin/users');
    } catch (error) {
        console.log('Error in blocking user');
        res.render('/admin/error-page');
    }
}

const unblockCustomer = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect('/admin/users');
    } catch (error) {
        console.log('Error in unblocking user');
        res.render('/admin/error-page');
    }
}


module.exports = {
    customerInfo,
    blockCustomer,
    unblockCustomer,
}
const User = require('../../models/userSchema');
const env = require('dotenv').config();
const bcrypt = require('bcrypt');

const customerInfo = async (req, res) => {
    try {
        let search = '';
        if (req.query.search) {
            search = req.query.search;
        }
        let page = 1;
        if (req.query.page) {
            page = req.query.page;
        }
        const limit = 3;
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


        res.render('customers', {
            data: userData,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            searchQuery: search
        });
    } catch (error) {
        console.error('Error on customers page', error);
        res.redirect('/admin/error-page');
    }
}

module.exports = {
    customerInfo,
}
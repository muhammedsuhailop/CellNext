const Brand = require('../../models/brandSchema');
const User = require('../../models/userSchema');
const fs = require('fs');
const path = require('path');
const uuidv4 = require('uuid').v4;
const { cloudinary } = require('../../config/cloudinary');


const loadBrandPage = async (req, res) => {
    try {
        let search = req.query.search || '';
        let page = parseInt(req.query.page) || 1;
        const limit = 10;
        if (page < 1) page = 1;

        const searchCondition = search ? { brandName: { $regex: search, $options: 'i' } } : {};

        const brandData = await Brand.find(searchCondition)
            .sort({ brandName: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Brand.countDocuments(searchCondition);

        const totalPages = Math.ceil(count / limit);
        if (page > totalPages) page = totalPages;

        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');
        const admin = await User.findById(req.session._id);

        res.render('brands', {
            admin,
            data: brandData,
            totalPages: totalPages,
            currentPage: page,
            searchQuery: search,
            searchAction: '/admin/brands',
            messages: {
                success: successMessage.length > 0 ? successMessage[0] : null,
                error: errorMessage.length > 0 ? errorMessage[0] : null,
            },
        });
    } catch (error) {
        console.error('Error on brand page', error);
        res.redirect('/admin/error-page');
    }
}

const loadAddBrandPage = async (req, res) => {
    try {
        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');
        const admin = await User.findById(req.session._id);

        res.render('brand-add', {
            admin,
            messages: {
                success: successMessage.length > 0 ? successMessage[0] : null,
                error: errorMessage.length > 0 ? errorMessage[0] : null,
            },
        });
    } catch (error) {
        console.error('Error on add brand page', error);
        res.redirect('/admin/error-page');
    }
}

const addBrand = async (req, res) => {
    try {
        const { name } = req.body;
        const files = req.files;

        if (!name || !/^[a-zA-Z][a-zA-Z0-9 _-]*[a-zA-Z0-9]$/.test(name)) {
            return res.status(400).json({ error: 'Brand name should only contain alphabets, spaces, and (-_) and start with an alphabet.' });
        }
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'Please upload at least one image.' });
        }

        const brandExists = await Brand.findOne({ brandName: name });
        if (brandExists) {
            return res.status(400).json({ error: 'Brand already exists.' });
        }

        const imageUrls = files.images[0].path;

        const newBrand = new Brand({
            brandName: name,
            brandImage: imageUrls,
        });

        await newBrand.save();
        res.json({ message: 'Brand created successfully!', brand: newBrand });

    } catch (error) {
        console.error('Error adding brand:', error);
        res.status(500).json({ error: 'An error occurred while adding the brand.' });
    }
};

const blockBrand = async (req, res) => {
    try {
        const { id, isBlocked } = req.body;

        await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });

        req.flash('success', 'Brand blocked successfully!');
        res.json({ message: 'Brand blocked successfully!' });
    } catch (error) {
        console.error('Error blocking brand:', error);
        res.status(500).json({ error: 'An error occurred while blocking the brand.' });
    }
}

const unblockBrand = async (req, res) => {
    try {
        const { id, isBlocked } = req.body;

        await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });

        req.flash('success', 'Brand unblocked successfully!');
        res.json({ message: 'Brand unblocked successfully!' });
    } catch (error) {
        console.error('Error unblocking brand:', error);
        res.status(500).json({ error: 'An error occurred while unblocking the brand.' });
    }
}


module.exports = {
    loadBrandPage,
    loadAddBrandPage,
    addBrand,
    blockBrand,
    unblockBrand
}

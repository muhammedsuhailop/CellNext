const Category = require('../../models/categorySchema');
const env = require('dotenv').config();
const bcrypt = require('bcrypt');

const categoryInfo = async (req, res) => {
    try {
        let search = req.query.search || '';
        let page = parseInt(req.query.page) || 1;
        const limit = 4;
        if (page < 1) page = 1;

        const searchCondition = search ? { name: { $regex: search, $options: 'i' } } : {};

        const categoryData = await Category.find(searchCondition)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        const count = await Category.countDocuments(searchCondition);

        const totalPages = Math.ceil(count / limit);
        if (page > totalPages) page = totalPages;

        res.render('category', {
            data: categoryData,
            totalPages: totalPages,
            currentPage: page,
            searchQuery: search,
            searchAction: '/admin/category',
        });
    } catch (error) {
        console.error('Error on category page', error);
        res.redirect('/admin/error-page');
    }
};


const addCategory = async (req, res) => {
    const { name, description } = req.body;
    try {
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ error: 'Category already exists' });
        }

        const newCategory = new Category({
            name,
            description,
        });
        await newCategory.save();

        return res.json({ message: 'Category added successfully' });
    } catch (error) {
        console.log('Unexpected error adding new category', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


const listCategory = async (req, res) => {
    try {
        const { id, isListed } = req.body;
        await Category.updateOne({ _id: id }, { $set: { isListed: true } });
        res.json({ message: 'Category listed successfully!' });
    } catch (error) {
        console.log('Error while listing category:', error);
        res.status(500).json({ error: 'An error occurred while listing the category.' });
    }
}

const unlistCategory = async (req, res) => {
    try {
        const { id, isListed } = req.body;
        await Category.updateOne({ _id: id }, { $set: { isListed: false } });
        res.json({ message: 'Category unlisted successfully!' });
    } catch (error) {
        console.log('Error while unlisting category:', error);
        res.status(500).json({ error: 'An error occurred while unlisting the category.' });
    }
}


const getEditCategory = async (req, res) => {
    try {
        const id = req.query.id;
        const category = await Category.findOne({ _id: id });
        res.render('edit-category', { category });
    } catch (error) {
        console.error('Error while loading edit category:', error);
        res.redirect('/admin/error-page');
    }
};

const editCategory = async (req, res) => {
    try {
        const { id } = req.query;
        const { name, description } = req.body;
        const existingCategory = await Category.findOne({ name });
        if (existingCategory && existingCategory._id.toString() !== id) {
            console.log('Category already exists');
            return res.status(400).json({
                errors: { name: 'This category name already exists.' },
            });
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name, description },
            { new: true }
        );

        if (updatedCategory) {
            console.log('Category updated successfully');
            return res.status(200).json({ message: 'Category updated successfully.' });
        } else {
            console.log('Category not found');
            return res.status(404).json({
                errors: { general: 'Category not found.' },
            });
        }
    } catch (error) {
        console.error('Error while editing category:', error);
        return res.status(500).json({
            errors: { general: 'An unexpected error occurred on the server.' },
        });
    }
};


module.exports = {
    categoryInfo,
    addCategory,
    getEditCategory,
    editCategory,
    listCategory,
    unlistCategory,

}
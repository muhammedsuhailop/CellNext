const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const Product = require('../../models/productSchema');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp')

const getAddProduct = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        res.render('product-add', {
            category: category,
            brand: brand
        })
    } catch (error) {
        console.log('Error on add product page loading', error);
        res.redirect('/admin/error-page');
    }
}

const addProduct = async (req, res) => {
    try {
        const product = req.body;
        const productExists = await Product.findOne({
            productName: product.productName
        });

        if (!productExists) {
            const images = [];
            console.log('req.files:', req.files);
            // Handle the uploaded images from multer
            req.files.forEach(file => {
                images.push('/uploads/product-images/' + file.filename); // Add the file path to the images array
            });

            const categoryId = await Category.findOne({ _id: product.category });
            if (!categoryId) {
                return res.status(400).json('Invalid category name');
            }

            const newProduct = new Product({
                productName: product.productName,
                description: product.descriptionid,
                category: product.category,
                brand: product.brand,
                regularPrice: product.regularPrice,
                salePrice: product.salePrice,
                createdAt: new Date(),
                quantity: product.quantity,
                color: product.color,
                storage: product.storage,
                productImage: images,
                status: 'Available',
            });

            await newProduct.save();
            return res.redirect('/admin/addProduct');
        } else {
            return res.status(400).json('Product already exists');
        }
    } catch (error) {
        console.log('Error on adding product ', error);
        res.redirect('/admin/error-page');
    }
};


module.exports = {
    getAddProduct,
    addProduct,
}
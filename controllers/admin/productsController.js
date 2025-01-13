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
        })

        console.log(productExists);

        if (!productExists) {
            const images = [];
            console.log('req.files:', req.files);

            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path;
                    const resizedImagePath = path.join('public', 'uploads', 'product-images', req.files[i].filename);
                    await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }

                const categoryId = await Category.findOne({ name: product.category });
                if (!categoryId) {
                    return res.status(400).json('Invalid category name');
                }

                const newProduct = new Product({
                    productName: product.productName,
                    description: product.description,
                    brand: product.brand,
                    regularPrice: product.regularPrice,
                    salePrice: product.salePrice,
                    createdAt: new Date(),
                    quantity: product.quantity,
                    color: product.color,
                    storage: product.storage,
                    productImage: images,
                    status: 'Available',
                })

                await newProduct.save();
                return res.redirect('/admin/addProduct');

            }
        } else {
            return res.status(400).json('Product already exists');
        }
    } catch (error) {
        console.log('Error on adding product ', error);
        res.redirect('/admin/error-page');
    }
}


module.exports = {
    getAddProduct,
    addProduct,
}
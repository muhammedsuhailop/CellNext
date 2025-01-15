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

        // Check if product already exists
        const productExists = await Product.findOne({
            productName: product.productName,
        });

        if (productExists) {
            return res.status(400).json('Product already exists');
        }

        const images = [];
        const croppedImageDir = path.join(__dirname, '../../public/uploads/product-images');

        if (!fs.existsSync(croppedImageDir)) {
            fs.mkdirSync(croppedImageDir, { recursive: true });
        }

        for (const file of req.files) {
            const originalPath = file.path;
            const croppedImagePath = path.join(
                croppedImageDir,
                `cropped-${Date.now()}-${file.originalname}`
            );

            await sharp(originalPath)
                .resize(150, 150)
                .toFile(croppedImagePath);

            fs.unlink(originalPath, (err) => {
                if (err) {
                    console.error('Error deleting original file:', err);
                } else {
                    console.log('Original file deleted:', originalPath);
                }
            });

            // Save the cropped image path to the array
            images.push(croppedImagePath.replace(/\\/g, '/').split('public')[1]);
        }

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
    } catch (error) {
        console.error('Error adding product:', error);
        res.redirect('/admin/error-page');
    }
};


module.exports = {
    getAddProduct,
    addProduct,
}
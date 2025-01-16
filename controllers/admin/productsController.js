const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const Product = require('../../models/productSchema');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const getAddProduct = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });

        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');

        res.render('product-add', {
            category: category,
            brand: brand,
            messages: {
                success: successMessage.length > 0 ? successMessage[0] : null,
                error: errorMessage.length > 0 ? errorMessage[0] : null,
            },
        });
    } catch (error) {
        console.log('Error on add product page loading', error);
        res.redirect('/admin/error-page');
    }
}

const addProduct = async (req, res) => {
    try {
        const product = req.body;

        const productExists = await Product.findOne({ productName: product.productName });
        if (productExists) {
            req.flash('error', 'Product already exists');
            return res.redirect('/admin/addProduct');
        }

        console.log('Directory name:', __dirname);
        const images = [];
        const croppedImageDir = path.join(__dirname, '../../public/uploads/product-images');

        if (!fs.existsSync(croppedImageDir)) {
            fs.mkdirSync(croppedImageDir, { recursive: true });
        }

        console.log('Uploaded files:', req.files);

        for (const file of req.files) {
            const originalPath = file.path;
            const uniqueId = uuidv4();
            const croppedImagePath = path.join(
                croppedImageDir,
                `crd-${uniqueId}-${file.originalname}`
            );

            console.log(`Processing file: ${file.originalname}`);
            console.log(`Original file path: ${originalPath}`);
            console.log(`Cropped file path: ${croppedImagePath}`);

            if (!fs.existsSync(originalPath)) {
                console.error(`File does not exist: ${originalPath}`);
                continue;
            }

            try {
                await sharp(originalPath)
                    .resize(500, 500)
                    .toFile(croppedImagePath);
                console.log('Cropping completed.');
                images.push(croppedImagePath.replace(/\\/g, '/').split('public')[1]);
            } catch (err) {
                console.error('Error processing file with sharp:', err);
                continue;
            }
        }

        const categoryId = await Category.findOne({ _id: product.category });
        if (!categoryId) {
            return res.status(400).json('Invalid category name');
        }

        const color = product.color === 'custom' ? product.custom_color : product.color;
        const newProduct = new Product({
            productName: product.productName,
            description: product.descriptionid,
            category: product.category,
            brand: product.brand,
            regularPrice: product.regularPrice,
            salePrice: product.salePrice,
            createdAt: new Date(),
            quantity: product.quantity,
            color: color,
            storage: product.storage,
            productImage: images,
            status: 'Available',
        });

        await newProduct.save();

        req.flash('success', 'Product added successfully!');
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
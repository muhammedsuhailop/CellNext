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

const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 5;

        const ProductData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } }
            ]
        })
            .limit(limit)
            .skip((page - 1) * limit)
            .populate('category')
            .sort({ createdAt: -1 })
            .exec();

        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } }
            ]
        }).countDocuments();
        const totalPages = Math.ceil(count / limit);

        const categoryData = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });

        const categoriesnames = categoryData.reduce((acc, cat) => {
            acc[cat._id] = cat.name;
            return acc;
        }, {});

        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');

        // Render the products page with the necessary data
        res.render('products', {
            decodeURIata: ProductData,
            totalPages: totalPages,
            currentPage: page,
            categoriesnames: categoriesnames,
            brand: brand,
            searchQuery: search,
            searchAction: '/admin/products',
            messages: {
                success: successMessage.length > 0 ? successMessage[0] : null,
                error: errorMessage.length > 0 ? errorMessage[0] : null,
            },
        });

    } catch (error) {
        console.error('Error listing product:', error);
        res.redirect('/admin/error-page');
    }
};

const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;

        const findProduct = await Product.findOne({ _id: productId });
        if (!findProduct) {
            return res.json({ status: false, message: 'Product not found' });
        }

        const findCategory = await Category.findOne({ _id: findProduct.category });
        if (!findCategory) {
            return res.json({ status: false, message: 'Category not found' });
        }

        let salePrice = findProduct.regularPrice;

        if (findCategory.categoryOffer > 0) {
            salePrice -= Math.floor(salePrice * (findCategory.categoryOffer / 100));
        }

        if (percentage > 0 && percentage <= 100) {
            salePrice -= Math.floor(salePrice * (percentage / 100));
        } else {
            return res.json({ status: false, message: 'Invalid product offer percentage' });
        }

        findProduct.salePrice = salePrice;
        findProduct.productOffer = parseInt(percentage);
        await findProduct.save();

        res.json({ status: true, message: 'Product offer applied successfully' });
    } catch (error) {
        console.error('Error adding product offer:', error);
        res.redirect('/admin/error-page');
    }
};


const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;

        const findProduct = await Product.findOne({ _id: productId });
        if (!findProduct) {
            return res.json({ status: false, message: 'Product not found' });
        }

        const findCategory = await Category.findById(findProduct.category);
        if (!findCategory) {
            return res.json({ status: false, message: 'Category not found' });
        }

        let salePrice = findProduct.regularPrice;

        if (findCategory.categoryOffer > 0) {
            salePrice -= Math.floor(salePrice * (findCategory.categoryOffer / 100));
        }

        findProduct.salePrice = salePrice;
        findProduct.productOffer = 0;

        await findProduct.save();

        res.json({ status: true, message: 'Product offer removed successfully' });
    } catch (error) {
        console.error('Error removing offer product:', error);
        res.redirect('/admin/error-page');
    }
};


const blockProduct = async (req, res) => {
    try {
        const { id, isBlocked } = req.body;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.json({ message: 'Product blocked successfully!' });
    } catch (error) {
        console.error('Error blocking product:', error);
        res.status(500).json({ error: 'An error occurred while blocking the product.' });
    }
}

const unblockProduct = async (req, res) => {
    try {
        const { id, isBlocked } = req.body;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.json({ message: 'Product unblocked successfully!' });
    } catch (error) {
        console.error('Error unblocking product:', error);
        res.status(500).json({ error: 'An error occurred while unblocking the product.' });
    }
}


const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const product = await Product.findOne({ _id: id });
        const category = await Category.find({});
        const brand = await Brand.find({});
        const categoryMap = category.reduce((acc, cat) => {
            acc[cat._id] = cat.name;
            return acc;
        }, {});
        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');
        res.render('product-edit', {
            product: product,
            category: category,
            categoryMap: categoryMap,
            brand: brand,
            messages: {
                success: successMessage.length > 0 ? successMessage[0] : null,
                error: errorMessage.length > 0 ? errorMessage[0] : null,
            },
        })
    } catch (error) {
        console.error('Error edit product:', error);
        res.redirect('/admin/error-page');
    }
}


const editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = req.body;

        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            req.flash('error', 'Product not found');
            return res.redirect(`/admin/editProduct/${productId}`);
        }

        const images = existingProduct.productImage;
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

        existingProduct.productName = product.productName;
        existingProduct.description = product.descriptionid;
        existingProduct.category = product.category;
        existingProduct.brand = product.brand;
        existingProduct.regularPrice = product.regularPrice;
        existingProduct.salePrice = product.salePrice;
        existingProduct.quantity = product.quantity;
        existingProduct.color = color;
        existingProduct.storage = product.storage;
        existingProduct.productImage = images;
        existingProduct.status = 'Available';
        existingProduct.updatedAt = new Date();

        await existingProduct.save();

        req.flash('success', 'Product updated successfully!');
        return res.redirect(`/admin/products`);

    } catch (error) {
        console.error('Error updating product:', error);
        res.redirect('/admin/error-page');
    }
};

const removeProductImage = async (req, res) => {
    try {
        const { productId, index } = req.params;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.productImage[index]) {
            const imagePath = path.join(__dirname, '../../public', product.productImage[index]);
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error('Error removing image file:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                product.productImage.splice(index, 1);
                product.save()
                    .then(() => res.status(200).json({ success: 'Image removed successfully' }))
                    .catch((error) => {
                        console.error('Error saving product:', error);
                        res.status(500).json({ error: 'Internal server error' });
                    });
            });
        } else {
            return res.status(400).json({ error: 'Image not found in product' });
        }
    } catch (error) {
        console.error('Error removing image:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


module.exports = {
    getAddProduct,
    addProduct,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    removeProductImage,
}

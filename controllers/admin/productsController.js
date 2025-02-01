const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const Product = require('../../models/productSchema');
const ProductV2 = require('../../models/productsSchemaV2');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

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

        const productExists = await ProductV2.findOne({ productName: product.productName });
        if (productExists) {
            req.flash('error', 'Product already exists');
            return res.redirect('/admin/addProduct');
        }

        const croppedImageDir = path.join(__dirname, '../../public/uploads/prod-imgs');
        if (!fs.existsSync(croppedImageDir)) {
            fs.mkdirSync(croppedImageDir, { recursive: true });
        }

        const images = [];
        const files = req.files?.images || [];

        for (const file of files) {
            const originalPath = file.path;
            const uniqueId = uuidv4();
            const croppedImagePath = path.join(
                croppedImageDir,
                `crd-img-${uniqueId}-${file.originalname}`
            );

            try {
                const imageMetadata = await sharp(originalPath).metadata();
                if (!imageMetadata) {
                    console.error('Invalid or corrupt image file:', originalPath);
                    continue;
                }
                await sharp(originalPath)
                    .resize(500, 500)
                    .toFile(croppedImagePath);
                images.push(croppedImagePath.replace(/\\/g, '/').split('public')[1]);
            } catch (err) {
                console.error('Error processing file with sharp:', err);
                continue;
            }
        }

        const categoryId = await Category.findOne({ _id: product.category });
        if (!categoryId) {
            req.flash('error', 'Invalid category name');
            return res.redirect('/admin/addProduct');
        }

        const color = product.color.toUpperCase();
        const firstVariant = {
            color,
            size: product.size.toUpperCase(),
            regularPrice: parseFloat(product.regularPrice),
            salePrice: parseFloat(product.salePrice),
            stock: parseInt(product.quantity, 10),
            images,
        };

        const newProduct = new ProductV2({
            productName: product.productName,
            description: product.descriptionid,
            category: product.category,
            brand: product.brand,
            productOffer: product.productOffer || 0,
            variants: [firstVariant],
            status: 'Available',
        });

        const savedProduct = await newProduct.save();

        req.flash('success', 'Product added successfully!');
        return res.redirect(`/admin/editProduct?id=${savedProduct._id}`);
    } catch (error) {
        console.error('Error adding product:', error);
        req.flash('error', 'An error occurred while adding the product.');
        res.redirect('/admin/error-page');
    }
};

const addProductVariant = async (req, res) => {
    try {
        const { id: productId } = req.params;
        const variantData = req.body;
        const files = req.files.variantImages || [];

        const product = await ProductV2.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const existingVariant = product.variants.find(variant =>
            variant.color === variantData.color &&
            variant.storage === variantData.storage
        );

        if (existingVariant) {
            return res.status(400).json({ success: false, message: 'A variant with the same color and storage already exists.' });
        }

        const croppedImageDir = path.join(__dirname, '../../public/uploads/prod-imgs');
        if (!fs.existsSync(croppedImageDir)) {
            fs.mkdirSync(croppedImageDir, { recursive: true });
        }

        const images = [];

        for (const file of files) {
            const originalPath = file.path;
            const uniqueId = uuidv4();
            const croppedImagePath = path.join(
                croppedImageDir,
                `crd-variant-img-${uniqueId}-${file.originalname}`
            );

            try {
                await sharp(originalPath)
                    .resize(500, 500)
                    .toFile(croppedImagePath);

                images.push(croppedImagePath.replace(/\\/g, '/').split('public')[1]);
            } catch (err) {
                console.error('Error processing file with sharp:', err);
                continue;
            }
        }

        const newVariant = {
            color: variantData.color.toUpperCase(),
            size: variantData.size.toUpperCase(),
            regularPrice: parseFloat(variantData.regularPrice),
            salePrice: parseFloat(variantData.salePrice),
            stock: parseInt(variantData.quantity, 10),
            images,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        product.variants.push(newVariant);
        await product.save();

        return res.status(200).json({ success: true, message: 'New variant added successfully!', variant: newVariant });
    } catch (error) {
        console.error('Error adding variant:', error);
        return res.status(500).json({ success: false, message: 'An error occurred while adding the variant.' });
    }
};


const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 8;

        const products = await ProductV2.find({
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

        // Flatten variants into separate "product-like" entries
        const ProductData = products.flatMap((product) => {
            return product.variants.map((variant, index) => ({
                _id: product._id,
                productName: product.productName,
                brand: product.brand,
                category: product.category,
                regularPrice: variant.regularPrice,
                salePrice: variant.salePrice,
                color: variant.color,
                size: variant.size,
                stock: variant.stock,
                isBlocked: product.isBlocked,
                productOffer: product.productOffer,
                variantNumber: index,
                createdAt: product.createdAt,
            }));
        });

        const count = await ProductV2.find({
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

        const findProduct = await ProductV2.findOne({ _id: productId });
        if (!findProduct) {
            return res.json({ status: false, message: 'Product not found' });
        }

        const findCategory = await Category.findOne({ _id: findProduct.category });
        if (!findCategory) {
            return res.json({ status: false, message: 'Category not found' });
        }

        if (!findProduct.variants || findProduct.variants.length === 0) {
            return res.json({ status: false, message: 'No variants found for the product' });
        }

        if (percentage <= 0 || percentage > 100) {
            return res.json({ status: false, message: 'Invalid product offer percentage' });
        }

        // Update sale price for each variant
        findProduct.variants = findProduct.variants.map(variant => {
            let salePrice = variant.regularPrice;

            if (findCategory.categoryOffer > 0) {
                salePrice -= Math.floor(salePrice * (findCategory.categoryOffer / 100));
            }

            salePrice -= Math.floor(salePrice * (percentage / 100));

            return {
                ...variant,
                salePrice,
            };
        });

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

        const findProduct = await ProductV2.findOne({ _id: productId });
        if (!findProduct) {
            return res.json({ status: false, message: 'Product not found' });
        }

        const findCategory = await Category.findById(findProduct.category);
        if (!findCategory) {
            return res.json({ status: false, message: 'Category not found' });
        }

        if (!findProduct.variants || findProduct.variants.length === 0) {
            return res.json({ status: false, message: 'No variants found for the product' });
        }

        // Reset sale price for each variant
        findProduct.variants = findProduct.variants.map(variant => {
            let salePrice = variant.regularPrice;

            if (findCategory.categoryOffer > 0) {
                salePrice -= Math.floor(salePrice * (findCategory.categoryOffer / 100));
            }

            return {
                ...variant,
                salePrice,
            };
        });

        findProduct.productOffer = 0;

        await findProduct.save();

        res.json({ status: true, message: 'Product offer removed successfully' });
    } catch (error) {
        console.error('Error removing product offer:', error);
        res.redirect('/admin/error-page');
    }
};



const blockProduct = async (req, res) => {
    try {
        const { id, isBlocked } = req.body;
        await ProductV2.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.json({ message: 'Product blocked successfully!' });
    } catch (error) {
        console.error('Error blocking product:', error);
        res.status(500).json({ error: 'An error occurred while blocking the product.' });
    }
}

const unblockProduct = async (req, res) => {
    try {
        const { id, isBlocked } = req.body;
        await ProductV2.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.json({ message: 'Product unblocked successfully!' });
    } catch (error) {
        console.error('Error unblocking product:', error);
        res.status(500).json({ error: 'An error occurred while unblocking the product.' });
    }
}


const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const product = await ProductV2.findOne({ _id: id });
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
        console.log('req body: ', req.body);

        const existingProduct = await ProductV2.findById(productId);
        if (!existingProduct) {
            req.flash('error', 'Product not found');
            return res.redirect(`/admin/products`);
        }

        const duplicateProduct = await ProductV2.findOne({
            productName: product.productName,
            _id: { $ne: productId }
        });

        if (duplicateProduct) {
            req.flash('error', 'A product with this name already exists.');
            return res.redirect(`/admin/editProduct/?id=${productId}`);
        }

        existingProduct.productName = product.productName || existingProduct.productName;
        existingProduct.description = product.description || existingProduct.description;
        existingProduct.category = product.category || existingProduct.category;
        existingProduct.brand = product.brand || existingProduct.brand;

        const categoryId = await Category.findOne({ _id: product.category });
        if (product.category && !categoryId) {
            req.flash('error', 'Invalid category');
            return res.redirect(`/admin/editProduct?id=${productId}`);
        }


        existingProduct.updatedAt = new Date();
        await existingProduct.save();

        req.flash('success', 'Product updated successfully!');
        return res.redirect(`/admin/products`);

    } catch (error) {
        console.error('Error updating product:', error);
        res.redirect('/admin/error-page');
    }
};


const editVariant = async (req, res) => {
    try {
        const productId = req.params.id;
        console.log('Uploaded files:', req.files);
        const variantIndex = req.params.variantIndex;
        const updatedVariant = req.body;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }

        const existingProduct = await ProductV2.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const variant = existingProduct.variants[variantIndex];
        if (!variant) {
            return res.status(404).json({ success: false, message: 'Variant not found' });
        }
        const isColorOrStorageChanged = variant.color !== updatedVariant.color || variant.storage !== updatedVariant.storage;

        if (isColorOrStorageChanged) {
            const isDuplicate = existingProduct.variants.some((existingVariant, index) => {
                if (index !== variantIndex) {
                    return existingVariant.color === updatedVariant.color &&
                        existingVariant.storage === updatedVariant.storage;
                }
                return false;
            });

            if (isDuplicate) {
                return res.status(400).json({ success: false, message: 'A variant with the same color and storage already exists.' });
            }
        }
        const images = existingProduct.variants[variantIndex].images || [];
        console.log('Images = ', images)
        const croppedImageDir = path.join(__dirname, '../../public/uploads/prod-imgs');

        if (!fs.existsSync(croppedImageDir)) {
            fs.mkdirSync(croppedImageDir, { recursive: true });
        }

        console.log('Uploaded files:', req.files);
        if (req.files.variantImages) {
            for (const file of req.files.variantImages) {
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
                    const imageMetadata = await sharp(originalPath).metadata();
                    if (!imageMetadata) {
                        console.error('Invalid or corrupt image file:', originalPath);
                        continue;
                    }
                    await sharp(originalPath)
                        .resize(500, 500)
                        .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
                        .toFile(croppedImagePath);
                    console.log('Cropping completed.');
                    images.push(croppedImagePath.replace(/\\/g, '/').split('public')[1]);
                } catch (err) {
                    console.error('Error processing file with sharp:', err);
                    continue;
                }
            }
        }

        variant.color = updatedVariant.color.toUpperCase();
        variant.size = updatedVariant.size.toUpperCase();
        variant.regularPrice = updatedVariant.regularPrice;
        variant.salePrice = updatedVariant.salePrice;
        variant.stock = updatedVariant.quantity;
        variant.images = images;
        variant.updatedAt = new Date();

        await existingProduct.save();

        return res.status(200).json({ success: true, message: 'Variant updated successfully!', variant: variant });

    } catch (error) {
        console.error('Error updating variant:', error);
        return res.status(500).json({ success: false, message: 'An error occurred while updating the variant.' });
    }
};

const removeProductImage = async (req, res) => {
    try {
        const { productId, index } = req.params;

        const product = await ProductV2.findById(productId);
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

const remeoveVariantImage = async (req, res) => {
    try {
        const { productId, variantIndex, index } = req.params;

        const product = await ProductV2.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const variant = product.variants[variantIndex];
        if (!variant) {
            return res.status(404).json({ error: 'Variant not found' });
        }

        if (variant.images && variant.images[index]) {
            const imagePath = path.join(__dirname, '../../public', variant.images[index]);
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error('Error removing image file:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                variant.images.splice(index, 1);
                product.save()
                    .then(() => res.status(200).json({ success: 'Variant image removed successfully' }))
                    .catch((error) => {
                        console.error('Error saving product:', error);
                        res.status(500).json({ error: 'Internal server error' });
                    });
            });
        } else {
            return res.status(400).json({ error: 'Image not found in variant' });
        }
    } catch (error) {
        console.error('Error removing image:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


const getAllVariants = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1; // Current page (default: 1)
        const limit = 8; // Number of items per page

        // Build the search query
        const query = {
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } }
            ]
        };

        // Get the total count of products matching the search query
        const totalProducts = await ProductV2.countDocuments(query);

        // Calculate total pages
        const totalPages = Math.ceil(totalProducts / limit);

        // Fetch products with pagination
        const products = await ProductV2.find(query)
            .limit(limit)
            .skip((page - 1) * limit)
            .populate('category')
            .sort({ createdAt: -1 })
            .exec();

        // Extract variants data
        const ProductData = products.flatMap((product) => {
            return product.variants.map((variant, index) => ({
                productId: product._id,
                productName: product.productName,
                variantIndex: index,
                regularPrice: variant.regularPrice,
                salePrice: variant.salePrice,
                stock: variant.stock,
                color: variant.color,
                size: variant.size
            }));
        });

        // Flash messages
        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');

        // Render the view with pagination data
        res.render('variants', {
            productData: ProductData,
            messages: {
                success: successMessage.length > 0 ? successMessage[0] : null,
                error: errorMessage.length > 0 ? errorMessage[0] : null,
            },
            currentPage: page,
            totalPages: totalPages,
            limit: limit,
            search: search,

        });
    } catch (error) {
        console.error('Error listing product:', error);
        res.redirect('/admin/error-page');
    }
};

const updateProductVariant = async (req, res) => {
    try {
        const { productId, variantIndex, salePrice, regularPrice, stock } = req.body;

        const product = await ProductV2.findById(productId);
        if (!product || variantIndex < 0 || variantIndex >= product.variants.length) {
            return res.status(404).json({ status: false, message: 'Invalid product or variant index.' });
        }

        product.variants[variantIndex].salePrice = salePrice;
        product.variants[variantIndex].regularPrice = regularPrice;
        product.variants[variantIndex].stock = stock;
        await product.save();

        res.status(200).json({ status: true, message: 'Product updated successfully!' });
    } catch (error) {
        console.error('Error updating product:', error);
        req.flash('error', 'Failed to update product.');
        res.redirect('/admin/products');
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
    editVariant,
    remeoveVariantImage,
    addProductVariant,
    getAllVariants,
    updateProductVariant,
}

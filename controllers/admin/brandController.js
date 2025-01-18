const Brand = require('../../models/brandSchema');
const brand = require('../../models/brandSchema');
const Product = require('../../models/productSchema');
const fs = require('fs');
const path = require('path');
const uuidv4 = require('uuid').v4;

const loadBrandPage = async (req, res) => {
    try {
        let search = req.query.search || '';
        let page = parseInt(req.query.page) || 1;
        const limit = 4;
        if (page < 1) page = 1;
        const brandData = await Brand.find({})
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
        console.log('Page :', page)

        const count = await Brand.countDocuments({});

        const totalPages = Math.ceil(count / limit);
        if (page > totalPages) page = totalPages;

        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');

        res.render('brands', {
            data: brandData,
            totalPages: totalPages,
            currentPage: page,
            searchQuery: search,
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

        res.render('brand-add', {
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
        const images = req.files;

        if (!name || !/^[a-zA-Z][a-zA-Z0-9 _-]*[a-zA-Z0-9]$/.test(name)) {
            return res.status(400).json({ error: 'Brand name should only contain alphabets, spaces, and (-_) and start with an alphabet.' });
        }
        if (!images || images.length === 0) {
            return res.status(400).json({ error: 'Please upload at least one image.' });
        }

        const brandExists = await Brand.findOne({ brandName: name });
        if (brandExists) {
            return res.status(400).json({ error: 'Brand already exists.' });
        }

        const imageDir = path.join(__dirname, '../../public/uploads/brands');

        if (!fs.existsSync(imageDir)) {
            fs.mkdirSync(imageDir, { recursive: true });
        }

        const imageUrls = [];
        for (const file of images) {
            const originalPath = file.path;
            const uniqueId = uuidv4();
            const imagePath = path.join(imageDir, `${uniqueId}-${file.originalname}`);

            console.log(`Processing file: ${file.originalname}`);
            console.log(`Original file path: ${originalPath}`);
            console.log(`Saving image to: ${imagePath}`);

            try {
                fs.renameSync(originalPath, imagePath);
                imageUrls.push(`${imagePath.split('public')[1].replace(/\\/g, '/')}`);
            } catch (err) {
                console.error('Error saving file:', err);
            }
        }

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
        let id = req.query.id;
        console.log('Block brand invoked');
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });
        req.flash('success', 'Brand blocked successfully!');
        res.redirect('/admin/brands');
    } catch (error) {
        console.error('Error blocking brand:', error);
        res.redirect('/admin/error-page');
    }
}

const unblockBrand = async (req, res) => {
    try {
        let id = req.query.id;
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });
        req.flash('success', 'Brand unblocked successfully!');
        res.redirect('/admin/brands');
    } catch (error) {
        console.error('Error blocking brand:', error);
        res.redirect('/admin/error-page');
    }
}


module.exports = {
    loadBrandPage,
    loadAddBrandPage,
    addBrand,
    blockBrand,
    unblockBrand
}

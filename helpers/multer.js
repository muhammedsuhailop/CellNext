const multer = require('multer');
const { storage } = require('../config/cloudinary');

// Middleware to set upload type dynamically before multer processes the file
const setUploadType = (type) => {
    return (req, res, next) => {
        req.uploadType = type;
        next();
    };
};

// Multer uploader configuration
const upload = multer({ storage }).fields([
    { name: 'images', maxCount: 5 },
    { name: 'variantImages', maxCount: 4 },
    { name: 'brandLogo', maxCount: 1 },
]);

module.exports = { upload, setUploadType };

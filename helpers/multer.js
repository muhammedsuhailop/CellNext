const multer = require('multer');
const path = require('path');

// Set storage engine
const storage = multer.diskStorage({
    destination: '../../public/uploads/prod-imgs',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Initialize upload variable and set file validation for multiple image fields
const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // 1 MB file size limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).fields([
    { name: 'images', maxCount: 5 }, // Allows multiple files for 'images' field
    { name: 'variantImages', maxCount: 4 } // Allows up to 4 variant images
]); 

// Check File Type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

module.exports = upload;


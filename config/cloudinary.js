const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folderName = 'prod-imgs';
    let transformation = [{ width: 500, height: 500, crop: 'fill' }];

    if (req.uploadType === 'brand') {
      folderName = 'brand-logos';
      transformation = [{ width: 300, height: 300, crop: 'limit' }];
    }

    return {
      folder: folderName,
      allowed_formats: ['jpg', 'jpeg', 'png'],
      transformation,
    };
  },
});

module.exports = { cloudinary, storage };

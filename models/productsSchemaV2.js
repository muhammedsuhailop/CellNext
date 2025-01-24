const mongoose = require('mongoose');
const { Schema } = mongoose;

const variantSchema = new Schema({
    color: { type: String, required: true },
    size: { type: String },
    storage: { type: String },
    regularPrice: {
        type: Number,
        required: true
    },
    salePrice: {
        type: Number,
        required: true,
        validate: {
            validator: function (value) {
                return value <= this.regularPrice;
            },
            message: 'Sale price must be less than or equal to the regular price.'
        }
    },
    stock: { type: Number, required: true },
    images: { type: [String], required: true },
}, { _id: false });

const reviewSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

const productSchema = new Schema({
    productName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    productOffer: {
        type: Number,
        default: 0
    },
    variants: [variantSchema],
    reviews: [reviewSchema],
    isBlocked: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['Available', 'Out of Stock', 'Discontinued'],
        required: true,
        default: 'Available'
    }
}, { timestamps: true });

const ProductV2 = mongoose.model('ProductV2', productSchema);
module.exports = ProductV2;

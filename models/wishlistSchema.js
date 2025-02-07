const mongoose = require('mongoose');
const { Schema } = mongoose;

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'ProductV2',
                required: true,
            },
            variantIndex: {
                type: Number,
                required: true,
            },
            addedOn: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);
module.exports = Wishlist;
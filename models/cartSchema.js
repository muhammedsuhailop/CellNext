const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
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
            variantId: {
                type: Number,
                required: true,
            },
            quantity: {
                type: Number,
                default: 1,
                min: 1,
            },
        },
    ],
    subTotal: {
        type: Number,
        default: 0,
    },
    deliveryCharge: {
        type: Number
    },
    total: {
        type: Number,
        default: 0,
    },
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Cart', cartSchema);




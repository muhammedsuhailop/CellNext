const mongoose = require('mongoose');
const { Schema } = mongoose;

const couponSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    startOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    expireOn: {
        type: Date,
        required: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true
    },
    maxDiscount: {
        type: Number,
        default: null
    },
    minimumOrderAmount: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    usageLimitPerUser: {
        type: Number,
        default: 1
    },
    totalUsageLimit: {
        type: Number,
        default: null
    },
    usedCount: {
        type: Map,
        of: Number,
        default: {}
    },
    totalUsed: {
        type: Number,
        default: 0
    },
    createdOn: {
        type: Date,
        default: Date.now,
    },
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
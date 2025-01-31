const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    orderItems: [{
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
        itemStatus: {
            type: String,
            enum: ['Pending', 'Processing', 'Placed', 'Shipped', 'Delivered', 'Cancelled', 'Cancel Request'],
            default: 'Pending'
        },
        cancellationReason: {
            type: String,
            default: ''
        }
    }],
    totalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        required: true,
        default: function () {
            return this.totalPrice - this.discount;
        }
    },
    address: {
        type: Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    invoiceDate: {
        type: Date,
        default: function () {
            return this.createdOn;
        }
    },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Placed', 'Shipped', 'Delivered', 'Cancelled', 'Cancel Request', 'Partially Cancelled', 'Return Request', 'Returned', 'Partially Returned']
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    couponApplied: {
        type: Boolean,
        default: false
    },
    coupon: {
        code: String,
        discount: Number
    },
    payment: {
        method: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
            default: 'Pending'
        },
        transactionId: {
            type: String,
            default: ''
        },
        paymentDate: {
            type: Date,
            default: Date.now
        },
        amountPaid: {
            type: Number,
            required: true
        }
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cancellationReason: {
        type: String
    },
    returnReason: {
        type: String
    },
    shippingDetails: {
        provider: String,
        trackingNumber: String
    }
});


const Orders = mongoose.model('Orders', orderSchema);
module.exports = Orders;
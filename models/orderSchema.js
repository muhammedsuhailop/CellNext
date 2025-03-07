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
        salePrice: {
            type: Number,
            required: true,
        },
        regularPrice: {
            type: Number,
            required: true,
        },
        itemStatus: {
            type: String,
            enum: ['Pending', 'Processing', 'Placed', 'Shipped', 'Delivered', 'Cancelled', 'Cancel Request', 'Return Request', 'Returned'],
            default: 'Pending'
        },
        cancellationReason: {
            type: String,
            default: ''
        },
        returnReason: {
            type: String,
        },
        deliveredOn: {
            type: Date
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
    deliveryCharge: {
        type: Number
    },
    finalAmount: {
        type: Number,
        required: true,
        default: function () {
            return this.totalPrice - this.discount + this.deliveryCharge;
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
        enum: ['Pending', 'Processing', 'Placed', 'Shipped', 'Delivered', 'Cancelled', 'Cancel Request', 'Partial Cancellation', 'Return Request', 'Returned', 'Partial Return']
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
        type: Schema.Types.ObjectId,
        ref: 'Coupon'
    },
    couponDiscount: {
        type: Number,
        defaut: 0
    },
    payment: {
        method: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Completed', 'Failed', 'Refunded', 'Partially Refunded', 'Cancelled'],
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
    shippingDetails: {
        provider: String,
        trackingNumber: String
    },
    additionalNote: {
        type: String,
        default: 'Nil'
    }
});


const Orders = mongoose.model('Orders', orderSchema);
module.exports = Orders;
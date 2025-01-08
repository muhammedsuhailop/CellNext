const momgoose = require('mongoose');
const { Schema } = momgoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        reqired: false,
        unique: false,
        sparse: true,
        default: null
    },
    googleId: {
        type: String,
        // unique: true
    },
    password: {
        type: String,
        required: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    cart: [{
        type: Schema.Types.ObjectId,
        ref: 'Cart'
    }],
    wallet: {
        type: Number,
        default: 0
    },
    wishlist: [{
        type: Schema.Types.ObjectId,
        ref: 'Wishlist'
    }],
    orderHistory: [{
        type: Schema.Types.ObjectId,
        ref: 'Orders'
    }],
    createdOn: {
        type: Date,
        default: Date.now
    },
    referalCode: {
        type: String,
    },
    redeemed: {
        type: Boolean
    },
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: 'Category'
        },
        brand: {
            type: String,
        },
        searchOn: {
            type: Date,
            default: Date.now
        }
    }]
})

const User = momgoose.model('User', userSchema);

module.exports = User;
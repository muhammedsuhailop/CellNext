const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Schema = mongoose.Schema;

const walletTransactionSchema = new Schema({
    transactionId: {
        type: String,
        default: uuidv4,
        unique: true
    },
    type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Transaction amount must be positive']
    },
    description: {
        type: String,
        default: ''
    },
    orderId: {
        type: Schema.Types.ObjectId,
        ref: 'Orders',
        default: null
    },
    transactionCategory: {
        type: String,
        enum: ['order_payment', 'refund', 'admin_credit', 'adjustment', 'referral'],
        default: 'adjustment'
    },
    balanceAfterTransaction: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const walletSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0,
        required: true
    },
    transactions: [walletTransactionSchema]
}, {
    timestamps: true
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
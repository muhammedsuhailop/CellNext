const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const addressSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    address: [{
        addressType: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        houseName: {
            type: String,
            required: true
        },
        landmark: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        pinCode: {
            type: Number,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        alternatePhone: {
            type: String,
            required: false
        },
        isDefault: {
            type: Boolean,
            default: false
        },
        addressId: {
            type: String,
            default: uuidv4
        }
    }]
})

const Address = mongoose.model('Address', addressSchema);

module.exports = Address
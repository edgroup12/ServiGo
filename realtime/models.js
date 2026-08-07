'use strict';

const mongoose = require('mongoose');

const getModel = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

const blacklistedTokenSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now, expires: '2h' }
}, { collection: 'blacklistedtokens' });

const messageSchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderModel: { type: String, required: true, enum: ['Customer', 'Worker'] },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
}, { collection: 'messages' });

const bookingSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, required: true },
    worker: { type: mongoose.Schema.Types.ObjectId, required: true },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'declined'],
        required: true
    }
}, { collection: 'bookings', timestamps: true });

const BlacklistedToken = getModel('BlacklistedToken', blacklistedTokenSchema);
const Booking = getModel('Booking', bookingSchema);
const Message = getModel('Message', messageSchema);

module.exports = { BlacklistedToken, Booking, Message };

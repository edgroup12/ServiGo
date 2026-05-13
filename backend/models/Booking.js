const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  address: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'declined'], default: 'pending' },
  estimatedPrice: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['bKash', 'Nagad', 'Cash'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);

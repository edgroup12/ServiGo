const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['Customer', 'Worker']
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Add Indexes
messageSchema.index({ bookingId: 1 });
messageSchema.index({ timestamp: 1 });
messageSchema.index({ senderId: 1 });

module.exports = mongoose.model('Message', messageSchema);

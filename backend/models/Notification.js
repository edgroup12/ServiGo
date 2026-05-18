const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['new_booking', 'booking_confirmed', 'booking_completed', 'booking_declined', 'new_message', 'system_alert'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  link: {
    type: String // To navigate when clicked (e.g., /customer-dashboard)
  },
  isRead: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Add Indexes
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

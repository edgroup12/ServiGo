const mongoose = require('mongoose');

const blacklistedTokenSchema = new mongoose.Schema({
  token: { 
    type: String, 
    required: true, 
    unique: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: '30d' // Automatically delete documents after 30 days (matches JWT expiration)
  }
});

module.exports = mongoose.model('BlacklistedToken', blacklistedTokenSchema);

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameBn: { type: String, required: true },
  icon: { type: String, required: true }, // e.g., 'Wrench', 'Zap' for lucide icons
});

module.exports = mongoose.model('Category', categorySchema);

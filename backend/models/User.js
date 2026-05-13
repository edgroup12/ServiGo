const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  password: { type: String },
  role: { type: String, enum: ['customer', 'worker'], required: true },
  phone: { type: String },
  // Worker specific fields
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  bio: { type: String },
  skills: [{ type: String }],
  pricePerHour: { type: Number },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
  distance: { type: Number }, // Dummy distance in km
  photoUrl: { type: String }
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

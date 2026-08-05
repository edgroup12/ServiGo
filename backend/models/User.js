const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['customer', 'worker', 'admin'], required: true },
  phone: { type: String, trim: true, maxlength: 30 },
  address: { type: String, trim: true, maxlength: 300 },
  // Worker specific fields. A worker profile is the beta service listing.
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  bio: { type: String, trim: true, maxlength: 1000 },
  skills: [{ type: String, trim: true, maxlength: 60 }],
  pricePerHour: { type: Number, min: 0, max: 100000 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },
  isAvailable: { type: Boolean, default: true },
  distance: { type: Number }, // Dummy distance in km
  photoUrl: { type: String },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false }
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || typeof candidatePassword !== 'string') return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Add Indexes
userSchema.index({ role: 1 });
userSchema.index({ category: 1 });

module.exports = mongoose.model('User', userSchema);

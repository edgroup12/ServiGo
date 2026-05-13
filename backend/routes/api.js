const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Category = require('../models/Category');
const Booking = require('../models/Booking');
const Message = require('../models/Message');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get workers (with optional category filter)
router.get('/workers', async (req, res) => {
  try {
    const { category } = req.query;
    const query = { role: 'worker' };
    if (category) query.category = category;
    
    const workers = await User.find(query).populate('category');
    res.json(workers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single worker by ID
router.get('/workers/:id', async (req, res) => {
  try {
    const worker = await User.findById(req.params.id).populate('category');
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    res.json(worker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update worker profile
router.put('/workers/:id', auth, async (req, res) => {
  try {
    // Only the worker themselves can update their profile
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized to update this profile' });
    }

    const { bio, skills, pricePerHour, photoUrl, name, phone } = req.body;
    
    const updatedWorker = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { bio, skills, pricePerHour, photoUrl, name, phone } },
      { new: true }
    ).populate('category');

    res.json(updatedWorker);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create a booking
router.post('/bookings', async (req, res) => {
  try {
    const newBooking = new Booking(req.body);
    const savedBooking = await newBooking.save();
    res.status(201).json(savedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get bookings for a user (customer or worker)
router.get('/bookings/user/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const query = user.role === 'customer' ? { customer: user._id } : { worker: user._id };
    const bookings = await Booking.find(query)
      .populate('customer')
      .populate({ path: 'worker', populate: { path: 'category' } })
      .sort({ date: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update booking status
router.patch('/bookings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get messages for a booking
router.get('/messages/:bookingId', async (req, res) => {
  try {
    const messages = await Message.find({ bookingId: req.params.bookingId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save a new message
router.post('/messages', async (req, res) => {
  try {
    const newMessage = new Message(req.body);
    const savedMessage = await newMessage.save();
    res.status(201).json(savedMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// REAL AUTH ROUTES
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, category } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const newUser = new User({
      name,
      email,
      password, // Will be hashed by pre-save hook
      role: role || 'customer',
      category: category || null
    });

    await newUser.save();

    // Create token
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email }).populate('category');
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    // Use model method to compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    // Create token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        category: user.category
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login mock: Return a user by role for the demo
router.get('/mock-user/:role', async (req, res) => {
  try {
    const user = await User.findOne({ role: req.params.role }).populate('category');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Create token for mock user
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        category: user.category
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

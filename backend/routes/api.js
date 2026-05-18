const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Category = require('../models/Category');
const Booking = require('../models/Booking');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const BlacklistedToken = require('../models/BlacklistedToken');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth, adminOnly } = require('../middleware/auth');

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get workers (with optional category filter and pagination)
router.get('/workers', async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    const query = { role: 'worker' };
    if (category) query.category = category;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const total = await User.countDocuments(query);
    const workers = await User.find(query)
      .populate('category')
      .skip(skip)
      .limit(limitNumber);

    res.json({
      workers,
      pagination: {
        total,
        page: pageNumber,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
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

// Get single user
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('category');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update worker availability
router.patch('/users/:id/availability', auth, async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isAvailable },
      { new: true }
    );
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
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

// Update customer profile
router.put('/customers/:id', auth, async (req, res) => {
  try {
    // Only the customer themselves can update their profile
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized to update this profile' });
    }

    const { name, phone, photoUrl } = req.body;

    const updatedCustomer = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { name, phone, photoUrl } },
      { new: true }
    );

    res.json(updatedCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create a booking
router.post('/bookings', auth, async (req, res) => {
  try {
    const newBooking = new Booking(req.body);
    const savedBooking = await newBooking.save();

    // Create Notification for the worker
    const customer = await User.findById(savedBooking.customer);
    const notification = new Notification({
      recipientId: savedBooking.worker,
      senderId: savedBooking.customer,
      type: 'new_booking',
      title: 'New Booking Request',
      message: `You have received a new booking request from ${customer?.name || 'a customer'}.`,
      link: '/worker-dashboard'
    });
    await notification.save();

    // Emit real-time notification
    if (req.io) {
      req.io.to(savedBooking.worker.toString()).emit('receive_notification', notification);
    }

    res.status(201).json(savedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get bookings for a user (customer or worker)
router.get('/bookings/user/:userId', auth, async (req, res) => {
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
router.patch('/bookings/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('worker');

    if (booking) {
      let title = '';
      let message = '';
      let recipientId = booking.customer;

      if (status === 'confirmed') {
        title = 'Booking Confirmed';
        message = `Your booking for ${booking.worker?.name || 'the service'} has been confirmed.`;
      } else if (status === 'completed') {
        title = 'Service Completed';
        message = `The service has been marked as complete. Thank you for choosing ServiGo!`;
      } else if (status === 'declined') {
        title = 'Booking Declined';
        message = `Your booking request was declined.`;
      }

      if (title && message) {
        const notification = new Notification({
          recipientId,
          senderId: booking.worker._id,
          type: `booking_${status}`,
          title,
          message,
          link: '/customer-dashboard'
        });
        await notification.save();

        // Emit real-time notification
        if (req.io) {
          req.io.to(recipientId.toString()).emit('receive_notification', notification);
        }
      }
    }

    res.json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get messages for a booking
router.get('/messages/:bookingId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ bookingId: req.params.bookingId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save a new message
router.post('/messages', auth, async (req, res) => {
  try {
    const newMessage = new Message(req.body);
    const savedMessage = await newMessage.save();

    // Create Notification for the recipient
    const booking = await Booking.findById(savedMessage.bookingId);
    if (booking) {
      const recipientId = savedMessage.senderId.toString() === booking.customer.toString()
        ? booking.worker
        : booking.customer;

      const notification = new Notification({
        recipientId,
        senderId: savedMessage.senderId,
        type: 'new_message',
        title: 'New Message',
        message: `You have a new message regarding booking #${booking._id.toString().slice(-6)}`,
        link: booking.customer.toString() === recipientId.toString() ? '/customer-dashboard' : '/worker-dashboard'
      });
      await notification.save();

      // Emit real-time notification
      if (req.io) {
        req.io.to(recipientId.toString()).emit('receive_notification', notification);
      }
    }

    res.status(201).json(savedMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Logout User
router.post('/auth/logout', auth, async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      await BlacklistedToken.create({ token });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging out', error: error.message });
  }
});

// Get Analytics for Dashboard Charts
router.get('/analytics/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // In a real production app, we would use MongoDB aggregation.
    // For this implementation, we will fetch the bookings and calculate.
    const query = user.role === 'customer' ? { customer: user._id } : { worker: user._id };
    const bookings = await Booking.find(query).populate({ path: 'worker', populate: { path: 'category' } });

    // Calculate last 7 days trend
    const trends = [0, 0, 0, 0, 0, 0, 0];
    const today = new Date();

    // Category distribution
    const categoryCount = {};
    let totalBookings = 0;

    bookings.forEach(booking => {
      // Trend calculation
      const bookingDate = new Date(booking.createdAt || booking.date);
      const diffTime = Math.abs(today - bookingDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 7) {
        // 0 is today, 6 is 6 days ago
        // We want 0 to be 6 days ago, 6 to be today in the array
        const index = 6 - diffDays;
        trends[index]++;
      }

      // Category calculation
      if (booking.worker && booking.worker.category) {
        const catName = booking.worker.category.name;
        categoryCount[catName] = (categoryCount[catName] || 0) + 1;
        totalBookings++;
      }
    });

    const categoryDistribution = Object.keys(categoryCount).map(cat => ({
      name: cat,
      percentage: Math.round((categoryCount[cat] / totalBookings) * 100) || 0
    }));

    res.json({ trends, categoryDistribution });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// REAL AUTH ROUTES
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, category } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

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
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Forbidden: Endpoint disabled in production' });
  }

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

// Admin Routes
router.get('/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalWorkers = await User.countDocuments({ role: 'worker' });
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalBookings = await Booking.countDocuments();
    const totalRevenue = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$estimatedPrice' } } }
    ]);

    res.json({
      totalUsers,
      totalWorkers,
      totalCustomers,
      totalBookings,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find().populate('category').skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      User.countDocuments()
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limit: limitNum
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/admin/bookings', auth, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find()
        .populate('customer')
        .populate('worker')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments()
    ]);

    res.json({
      bookings,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limit: limitNum
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/admin/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;

    // Cascade: delete user's bookings, messages, notifications
    await Booking.deleteMany({ $or: [{ customer: userId }, { worker: userId }] });
    await Message.deleteMany({ senderId: userId });
    await Notification.deleteMany({ $or: [{ recipientId: userId }, { senderId: userId }] });

    await User.findByIdAndDelete(userId);
    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get notifications for a user
router.get('/notifications/:userId', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.params.userId })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark single notification as read
router.patch('/notifications/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mark all as read
router.patch('/notifications/user/:userId/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.params.userId, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

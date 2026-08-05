const express = require('express');
const crypto = require('node:crypto');
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

const publicRoles = new Set(['customer', 'worker']);
const bookingStatuses = new Set(['pending', 'confirmed', 'completed', 'declined']);
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const canAccessUser = (requester, userId) => (
  requester.role === 'admin' || requester.id === userId
);

const isBookingParticipant = (booking, userId) => (
  booking.customer.toString() === userId || booking.worker.toString() === userId
);

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get workers (with server-side search, filtering, and bounded pagination)
router.get('/workers', async (req, res) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      minRating,
      available,
      page = 1,
      limit = 12
    } = req.query;
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNumber = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 12));
    const query = { role: 'worker' };

    if (category) query.category = category;
    if (typeof search === 'string' && search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.name = { $regex: escapedSearch, $options: 'i' };
    }
    if (available === 'true') query.isAvailable = true;

    const parsedMinPrice = Number(minPrice);
    const parsedMaxPrice = Number(maxPrice);
    if (minPrice !== undefined && Number.isFinite(parsedMinPrice) && parsedMinPrice >= 0) {
      query.pricePerHour = { ...query.pricePerHour, $gte: parsedMinPrice };
    }
    if (maxPrice !== undefined && Number.isFinite(parsedMaxPrice) && parsedMaxPrice >= 0) {
      query.pricePerHour = { ...query.pricePerHour, $lte: parsedMaxPrice };
    }

    const parsedMinRating = Number(minRating);
    if (minRating !== undefined && Number.isFinite(parsedMinRating) && parsedMinRating >= 0 && parsedMinRating <= 5) {
      query.rating = { $gte: parsedMinRating };
    }

    if (query.pricePerHour?.$gte > query.pricePerHour?.$lte) {
      return res.status(400).json({ message: 'Minimum price cannot exceed maximum price' });
    }

    const skip = (pageNumber - 1) * limitNumber;
    const [total, workers] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .populate('category')
        .sort({ rating: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
    ]);

    res.json({
      workers,
      pagination: {
        total,
        page: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        limit: limitNumber
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

// Get single user (self or admin only)
router.get('/users/:id', auth, async (req, res) => {
  try {
    if (!canAccessUser(req.user, req.params.id)) {
      return res.status(403).json({ message: 'Unauthorized to view this user' });
    }
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
    if (!canAccessUser(req.user, req.params.id)) {
      return res.status(403).json({ message: 'Unauthorized to update availability' });
    }
    if (typeof req.body.isAvailable !== 'boolean') {
      return res.status(400).json({ message: 'isAvailable must be a boolean' });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'worker' },
      { isAvailable: req.body.isAvailable },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: 'Worker not found' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update worker profile
router.put('/workers/:id', auth, async (req, res) => {
  try {
    // Only the worker themselves or an admin can update their profile
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to update this profile' });
    }

    // Admin updating: preserve role and category if not provided
    if (req.user.role === 'admin' && req.user.id !== req.params.id) {
      const existing = await User.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Worker not found' });
      // Don't allow admin to change role through this endpoint
      delete req.body.role;
    }

    const { bio, skills, pricePerHour, photoUrl, name, phone } = req.body;
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedSkills = Array.isArray(skills)
      ? skills.map(skill => typeof skill === 'string' ? skill.trim() : '').filter(Boolean)
      : [];
    const parsedPrice = Number(pricePerHour);

    if (normalizedName.length < 2 || normalizedName.length > 80) {
      return res.status(400).json({ message: 'Name must be between 2 and 80 characters' });
    }
    if (normalizedSkills.length > 20) {
      return res.status(400).json({ message: 'A service listing can include at most 20 skills' });
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0 || parsedPrice > 100000) {
      return res.status(400).json({ message: 'Hourly price must be between 0 and 100000' });
    }

    const updatedWorker = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'worker' },
      {
        $set: {
          bio: typeof bio === 'string' ? bio.trim() : '',
          skills: normalizedSkills,
          pricePerHour: parsedPrice,
          photoUrl: typeof photoUrl === 'string' ? photoUrl.trim() : '',
          name: normalizedName,
          phone: typeof phone === 'string' ? phone.trim() : ''
        }
      },
      { new: true, runValidators: true }
    ).populate('category');

    if (!updatedWorker) return res.status(404).json({ message: 'Worker not found' });
    res.json(updatedWorker);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update customer profile
router.put('/customers/:id', auth, async (req, res) => {
  try {
    // Only the customer themselves or an admin can update their profile
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to update this profile' });
    }

    const { name, phone, photoUrl, address } = req.body;
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      return res.status(400).json({ message: 'Name must be between 2 and 80 characters' });
    }

    const updatedCustomer = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'customer' },
      {
        $set: {
          name: normalizedName,
          phone: typeof phone === 'string' ? phone.trim() : '',
          photoUrl: typeof photoUrl === 'string' ? photoUrl.trim() : '',
          address: typeof address === 'string' ? address.trim() : ''
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedCustomer) return res.status(404).json({ message: 'Customer not found' });
    res.json(updatedCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create a booking
router.post('/bookings', auth, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can create bookings' });
    }

    const { worker, date, address, description, paymentMethod, transactionId } = req.body;
    if (!worker || !date || !address?.trim() || !description?.trim() || !paymentMethod) {
      return res.status(400).json({ message: 'Worker, date, address, description, and payment method are required' });
    }
    if (address.trim().length > 300 || description.trim().length > 1000) {
      return res.status(400).json({ message: 'Address or description is too long' });
    }

    const bookingDate = new Date(date);
    if (Number.isNaN(bookingDate.getTime()) || bookingDate <= new Date()) {
      return res.status(400).json({ message: 'Booking date must be a valid future date' });
    }

    const selectedWorker = await User.findOne({ _id: worker, role: 'worker' });
    if (!selectedWorker) return res.status(404).json({ message: 'Worker not found' });
    if (!selectedWorker.isAvailable) {
      return res.status(409).json({ message: 'This worker is currently unavailable' });
    }
    if (!Number.isFinite(selectedWorker.pricePerHour) || selectedWorker.pricePerHour < 0) {
      return res.status(400).json({ message: 'This worker does not have a valid hourly rate' });
    }

    const estimatedHours = 2;
    const newBooking = new Booking({
      customer: req.user.id,
      worker,
      date: bookingDate,
      address: address.trim(),
      description: description.trim(),
      estimatedPrice: selectedWorker.pricePerHour * estimatedHours,
      paymentMethod,
      transactionId: typeof transactionId === 'string' ? transactionId.trim() : undefined
    });
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
    if (!canAccessUser(req.user, req.params.userId)) {
      return res.status(403).json({ message: 'Unauthorized to view these bookings' });
    }
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
    if (!bookingStatuses.has(status) || status === 'pending') {
      return res.status(400).json({ message: 'Invalid booking status' });
    }

    const existingBooking = await Booking.findById(req.params.id);
    if (!existingBooking) return res.status(404).json({ message: 'Booking not found' });
    if (req.user.role !== 'admin' && existingBooking.worker.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the assigned worker can update this booking' });
    }

    const allowedTransitions = {
      pending: new Set(['confirmed', 'declined']),
      confirmed: new Set(['completed']),
      completed: new Set(),
      declined: new Set()
    };
    if (!allowedTransitions[existingBooking.status]?.has(status)) {
      return res.status(400).json({ message: `Cannot change booking from ${existingBooking.status} to ${status}` });
    }

    existingBooking.status = status;
    const booking = await existingBooking.save();
    await booking.populate('worker');

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
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (req.user.role !== 'admin' && !isBookingParticipant(booking, req.user.id)) {
      return res.status(403).json({ message: 'Unauthorized to view these messages' });
    }
    const messages = await Message.find({ bookingId: req.params.bookingId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save a new message
router.post('/messages', auth, async (req, res) => {
  try {
    const { bookingId, content } = req.body;
    if (!bookingId || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'Booking and message content are required' });
    }
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!isBookingParticipant(booking, req.user.id)) {
      return res.status(403).json({ message: 'Unauthorized to message this booking' });
    }

    const newMessage = new Message({
      bookingId,
      senderId: req.user.id,
      senderModel: req.user.role === 'customer' ? 'Customer' : 'Worker',
      content: content.trim()
    });
    const savedMessage = await newMessage.save();

    // Create Notification for the recipient
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
    if (!canAccessUser(req.user, req.params.userId)) {
      return res.status(403).json({ message: 'Unauthorized to view these analytics' });
    }
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
    const { name, email, password, role = 'customer', category, phone } = req.body;
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (normalizedName.length < 2 || normalizedName.length > 80) {
      return res.status(400).json({ message: 'Name must be between 2 and 80 characters' });
    }
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }
    if (typeof password !== 'string' || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include a letter and number' });
    }
    if (!publicRoles.has(role)) {
      return res.status(400).json({ message: 'Role must be customer or worker' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const newUser = new User({
      name: normalizedName,
      email: normalizedEmail,
      password,
      role,
      phone: typeof phone === 'string' ? phone.trim() : undefined,
      category: role === 'worker' && category ? category : null
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
    if (typeof email !== 'string' || typeof password !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'A valid email and password are required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() })
      .select('+password')
      .populate('category');
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

router.post('/auth/forgot-password', async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const user = await User.findOne({ email });
    let resetToken;
    if (user) {
      resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
      await user.save({ validateModifiedOnly: true });
    }

    const response = { message: 'If an account exists for that email, password reset instructions have been created.' };
    if (resetToken && process.env.NODE_ENV !== 'production') response.resetToken = resetToken;
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Unable to start password reset' });
  }
});

router.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (typeof token !== 'string' || token.length < 32) {
      return res.status(400).json({ message: 'A valid reset token is required' });
    }
    if (typeof password !== 'string' || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include a letter and number' });
    }

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpires');
    if (!user) return res.status(400).json({ message: 'Reset token is invalid or expired' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to reset password' });
  }
});

// NOTE: /mock-user/:role endpoint has been permanently removed for security.

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
    if (!canAccessUser(req.user, req.params.userId)) {
      return res.status(403).json({ message: 'Unauthorized to view these notifications' });
    }
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
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mark all as read
router.patch('/notifications/user/:userId/read-all', auth, async (req, res) => {
  try {
    if (!canAccessUser(req.user, req.params.userId)) {
      return res.status(403).json({ message: 'Unauthorized to update these notifications' });
    }
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

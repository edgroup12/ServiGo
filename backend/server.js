require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { MongoMemoryServer } = require('mongodb-memory-server');
const apiRoutes = require('./routes/api');
const seedDatabase = require('./seed');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

// Security: helmet middleware with relaxed policies for API
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:4173'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Socket.io integration
io.on('connection', (socket) => {
  console.log('User connected to chat/tracking:', socket.id);

  socket.on('join_user', (userId) => {
    socket.join(userId);
    console.log(`User joined personal room: ${userId}`);
  });

  socket.on('join_booking', (bookingId) => {
    socket.join(bookingId);
    console.log(`User joined booking room: ${bookingId}`);
  });

  socket.on('send_message', (data) => {
    io.to(data.bookingId).emit('receive_message', data);
  });

  socket.on('send_notification', (data) => {
    // Data expected: { recipientId, title, message, type, link, timestamp }
    io.to(data.recipientId).emit('receive_notification', data);
  });

  socket.on('update_location', (data) => {
    // Expected data: { bookingId, lat, lng, timestamp }
    io.to(data.bookingId).emit('location_updated', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false)
    : allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Input validation middleware
const { body, validationResult } = require('express-validator');

// Validation helper
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }
  next();
};

module.exports = { validate };

// Pass io to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

const rateLimit = require('express-rate-limit');
const paymentRoutes = require('./routes/payment');

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for auth routes (50 requests per 5 minutes per IP)
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  message: { message: 'Too many attempts, please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api', limiter);
app.use('/api', apiRoutes);
app.use('/api/payment', paymentRoutes);

// Centralized 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default server error
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // Environment variable validation
    const requiredVars = ['JWT_SECRET'];
    const missing = requiredVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
      process.exit(1);
    }

    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      // Only use in-memory MongoDB in non-production environments
      if (process.env.NODE_ENV === 'production') {
        console.error('FATAL: MONGODB_URI is required in production');
        process.exit(1);
      }
      // Start in-memory MongoDB
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      console.log('Started in-memory MongoDB at', mongoUri);
    }

    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');

    // Run seeder only if SEED_DB environment variable is set to 'true'
    if (process.env.SEED_DB === 'true') {
      console.log('Seeding database...');
      await seedDatabase();
    }

    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
};

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

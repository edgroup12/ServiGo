require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('./app');
const connectDatabase = require('./db');
const seedDatabase = require('./seed');

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

// Make io accessible to routes via the app
app.set('io', io);

// Socket.io integration
io.on('connection', (socket) => {
  console.log('User connected to chat/tracking:', socket.id);

  socket.on('join_user', (userId) => {
    socket.join(String(userId));
    console.log(`User joined personal room: ${userId}`);
  });

  socket.on('join_booking', (bookingId) => {
    socket.join(String(bookingId));
    console.log(`User joined booking room: ${bookingId}`);
  });

  socket.on('send_message', (data) => {
    io.to(data.bookingId).emit('receive_message', data);
  });

  socket.on('send_notification', (data) => {
    io.to(data.recipientId).emit('receive_notification', data);
  });

  socket.on('update_location', (data) => {
    io.to(data.bookingId).emit('location_updated', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
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

    if (mongoUri) {
      try {
        console.log('Attempting to connect to MongoDB...');
        await connectDatabase(mongoUri);
        console.log('MongoDB connected successfully to primary URI');
      } catch (dbErr) {
        console.warn('Failed to connect to process.env.MONGODB_URI:', dbErr.message);
        if (process.env.NODE_ENV === 'production') {
          throw dbErr;
        }
        console.log('Falling back to in-memory MongoDB for local development...');
        mongoUri = null;
      }
    }

    if (!mongoUri) {
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      console.log('Started in-memory MongoDB at', mongoUri);
      await mongoose.connect(mongoUri);
      console.log('In-memory MongoDB connected');
      console.log('Seeding in-memory database...');
      await seedDatabase();
    } else if (process.env.SEED_DB === 'true') {
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

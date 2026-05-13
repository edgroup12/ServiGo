require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');
const apiRoutes = require('./routes/api');
const seedDatabase = require('./seed');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.io integration
io.on('connection', (socket) => {
  console.log('User connected to chat/tracking:', socket.id);
  
  socket.on('join_booking', (bookingId) => {
    socket.join(bookingId);
    console.log(`User joined booking room: ${bookingId}`);
  });

  socket.on('send_message', (data) => {
    io.to(data.bookingId).emit('receive_message', data);
  });

  socket.on('update_location', (data) => {
    // Expected data: { bookingId, lat, lng, timestamp }
    io.to(data.bookingId).emit('location_updated', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
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
  }
};

startServer();

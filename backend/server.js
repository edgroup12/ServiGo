require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const connectDatabase = require('./db');
const seedDatabase = require('./seed');

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    const useMemoryDatabase = process.env.USE_MEMORY_DB === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    const requiredVars = ['JWT_SECRET'];
    if (!useMemoryDatabase) requiredVars.push('MONGODB_URI');

    const missing = requiredVars.filter(variable => !process.env[variable]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    if (isProduction && useMemoryDatabase) {
      throw new Error('USE_MEMORY_DB cannot be enabled in production');
    }

    if (useMemoryDatabase) {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      console.log('Starting explicitly configured in-memory database for development');
      await mongoose.connect(mongoServer.getUri());
      await seedDatabase();
    } else {
      console.log('Connecting to MongoDB...');
      await connectDatabase(process.env.MONGODB_URI);
      console.log('MongoDB connected');

      if (process.env.SEED_DB === 'true') {
        if (isProduction) throw new Error('SEED_DB cannot be enabled in production');
        console.log('Seeding development database...');
        await seedDatabase();
      }
    }

    app.listen(PORT, () => console.log(`HTTP API running on port ${PORT}`));
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
